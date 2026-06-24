package com.llaveroseguro.backend;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BackendApiTests {
  @Autowired
  MockMvc mockMvc;

  @Autowired
  ObjectMapper objectMapper;

  @Test
  void registersAndLogsInWithoutReturningPasswordHash() throws Exception {
    String email = "ana@example.test";

    mockMvc.perform(post("/api/auth/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(Map.of("email", email, "displayName", "Ana", "password", "remote-password-1"))))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.token").isString())
        .andExpect(jsonPath("$.user.email").value(email))
        .andExpect(jsonPath("$.user.passwordHash").doesNotExist());

    mockMvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(Map.of("email", email, "password", "remote-password-1"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.token").isString())
        .andExpect(jsonPath("$.user.passwordHash").doesNotExist());
  }

  @Test
  void rejectsDuplicateEmail() throws Exception {
    String email = "duplicado@example.test";
    register(email, "Duplicado");

    mockMvc.perform(post("/api/auth/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(Map.of("email", email, "displayName", "Duplicado 2", "password", "remote-password-2"))))
        .andExpect(status().isConflict());
  }

  @Test
  void createsVaultForAuthenticatedUser() throws Exception {
    String token = register("vault-owner@example.test", "Vault Owner");

    mockMvc.perform(post("/api/vaults")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(vaultBody("client-vault-a", "Personal", "ciphertext-a"))))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.clientVaultId").value("client-vault-a"))
        .andExpect(jsonPath("$.displayName").value("Personal"))
        .andExpect(jsonPath("$.encryptedPayload").value("ciphertext-a"));
  }

  @Test
  void keepsOnlyOneActiveVaultPerUser() throws Exception {
    String token = register("single-vault@example.test", "Single Vault");
    String firstVaultId = createVault(token, "client-vault-first", "Primera", "ciphertext-first");
    String secondVaultId = createVault(token, "client-vault-second", "Segunda", "ciphertext-second");

    org.junit.jupiter.api.Assertions.assertEquals(firstVaultId, secondVaultId);
    mockMvc.perform(get("/api/vaults")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].clientVaultId").value("client-vault-second"))
        .andExpect(jsonPath("$[0].encryptedPayload").value("ciphertext-second"));
  }

  @Test
  void returnsAuthenticatedUserProfile() throws Exception {
    String email = "me@example.test";
    String token = register(email, "Me");

    mockMvc.perform(get("/api/auth/me")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.email").value(email))
        .andExpect(jsonPath("$.passwordHash").doesNotExist());
  }

  @Test
  void changesRemotePasswordAndInvalidatesPreviousToken() throws Exception {
    String email = "change-password@example.test";
    String oldToken = register(email, "Password Change");

    mockMvc.perform(post("/api/auth/password")
            .header("Authorization", "Bearer " + oldToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(Map.of("currentPassword", "incorrect-password", "newPassword", "new-remote-password-2"))))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value("La contraseña actual de la cuenta no es correcta."));

    MvcResult changed = mockMvc.perform(post("/api/auth/password")
            .header("Authorization", "Bearer " + oldToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(Map.of("currentPassword", "remote-password-1", "newPassword", "new-remote-password-2"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.token").isString())
        .andExpect(jsonPath("$.user.email").value(email))
        .andReturn();
    String newToken = objectMapper.readTree(changed.getResponse().getContentAsString()).get("token").asText();

    mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + oldToken))
        .andExpect(status().isUnauthorized());
    mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + newToken))
        .andExpect(status().isOk());
    mockMvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(Map.of("email", email, "password", "remote-password-1"))))
        .andExpect(status().isUnauthorized());
    mockMvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(Map.of("email", email, "password", "new-remote-password-2"))))
        .andExpect(status().isOk());
  }

  @Test
  void listsOnlyAuthenticatedUsersVaults() throws Exception {
    String ownerToken = register("list-owner@example.test", "List Owner");
    String otherToken = register("list-other@example.test", "List Other");

    createVault(ownerToken, "client-vault-owner", "Owner vault", "owner-ciphertext");
    createVault(otherToken, "client-vault-other", "Other vault", "other-ciphertext");

    mockMvc.perform(get("/api/vaults")
            .header("Authorization", "Bearer " + ownerToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].clientVaultId").value("client-vault-owner"))
        .andExpect(jsonPath("$[0].encryptedPayload").value("owner-ciphertext"));
  }

  @Test
  void preventsAccessToAnotherUsersVault() throws Exception {
    String ownerToken = register("owner@example.test", "Owner");
    String otherToken = register("other@example.test", "Other");

    String vaultId = createVault(ownerToken, "client-vault-private", "Privada", "encrypted-private");

    mockMvc.perform(get("/api/vaults/{id}", vaultId)
            .header("Authorization", "Bearer " + otherToken))
        .andExpect(status().isNotFound());
  }

  @Test
  void updatesOwnedVault() throws Exception {
    String token = register("update-owner@example.test", "Update Owner");
    String vaultId = createVault(token, "client-vault-update", "Anterior", "old-ciphertext");

    mockMvc.perform(put("/api/vaults/{id}", vaultId)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(vaultBody("client-vault-update", "Nueva", "new-ciphertext"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.displayName").value("Nueva"))
        .andExpect(jsonPath("$.encryptedPayload").value("new-ciphertext"));
  }

  @Test
  void deletesOwnedVault() throws Exception {
    String token = register("delete-owner@example.test", "Delete Owner");
    String vaultId = createVault(token, "client-vault-delete", "Temporal", "delete-ciphertext");

    mockMvc.perform(delete("/api/vaults/{id}", vaultId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isNoContent());

    mockMvc.perform(get("/api/vaults/{id}", vaultId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isNotFound());
  }

  @Test
  void requiresAuthenticationForVaults() throws Exception {
    mockMvc.perform(get("/api/vaults"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.message").value("Token invalido o ausente."));
  }

  @Test
  void rejectsOversizedPayload() throws Exception {
    String token = register("payload-owner@example.test", "Payload Owner");
    String oversizedPayload = "x".repeat(1048577);

    mockMvc.perform(post("/api/vaults")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(vaultBody("client-vault-large", "Grande", oversizedPayload))))
        .andExpect(status().isPayloadTooLarge())
        .andExpect(jsonPath("$.message").value("El payload cifrado supera el tamano permitido."));
  }

  @Test
  void loginRejectsInvalidPassword() throws Exception {
    String email = "bad-login@example.test";
    register(email, "Bad Login");

    mockMvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(Map.of("email", email, "password", "wrong-password"))))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.message", not(containsString("remote-password"))));
  }

  private String register(String email, String displayName) throws Exception {
    MvcResult result = mockMvc.perform(post("/api/auth/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(Map.of("email", email, "displayName", displayName, "password", "remote-password-1"))))
        .andExpect(status().isCreated())
        .andReturn();
    JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
    return json.get("token").asText();
  }

  private String createVault(String token, String clientVaultId, String displayName, String encryptedPayload) throws Exception {
    MvcResult created = mockMvc.perform(post("/api/vaults")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(vaultBody(clientVaultId, displayName, encryptedPayload))))
        .andExpect(status().isCreated())
        .andReturn();
    return objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();
  }

  private Map<String, Object> vaultBody(String clientVaultId, String displayName, String encryptedPayload) {
    return Map.of(
        "clientVaultId", clientVaultId,
        "displayName", displayName,
        "encryptedPayload", encryptedPayload,
        "payloadVersion", 1
    );
  }

  private String json(Object value) throws Exception {
    return objectMapper.writeValueAsString(value);
  }
}
