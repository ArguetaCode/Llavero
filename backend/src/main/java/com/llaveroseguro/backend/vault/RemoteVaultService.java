package com.llaveroseguro.backend.vault;

import com.llaveroseguro.backend.common.ApiException;
import com.llaveroseguro.backend.config.AppProperties;
import com.llaveroseguro.backend.user.AppUser;
import com.llaveroseguro.backend.vault.VaultDtos.VaultRequest;
import com.llaveroseguro.backend.vault.VaultDtos.VaultResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RemoteVaultService {
  private final RemoteVaultRepository vaults;
  private final int maxEncryptedPayloadBytes;

  public RemoteVaultService(RemoteVaultRepository vaults, AppProperties properties) {
    this.vaults = vaults;
    this.maxEncryptedPayloadBytes = properties.vault().maxEncryptedPayloadBytes();
  }

  @Transactional(readOnly = true)
  public List<VaultResponse> list(AppUser user) {
    return vaults.findAllByUserAndDeletedAtIsNullOrderByUpdatedAtDesc(user).stream()
        .map(this::toResponse)
        .toList();
  }

  @Transactional
  public VaultResponse create(AppUser user, VaultRequest request) {
    validatePayloadSize(request.encryptedPayload());
    RemoteVault vault = vaults.findFirstByUserAndDeletedAtIsNullOrderByUpdatedAtDesc(user)
        .orElseGet(() -> {
          RemoteVault created = new RemoteVault();
          created.setUser(user);
          return created;
        });
    apply(vault, request);
    return toResponse(vaults.save(vault));
  }

  @Transactional(readOnly = true)
  public VaultResponse get(AppUser user, UUID id) {
    return toResponse(findOwned(user, id));
  }

  @Transactional
  public VaultResponse update(AppUser user, UUID id, VaultRequest request) {
    validatePayloadSize(request.encryptedPayload());
    RemoteVault vault = findOwned(user, id);
    apply(vault, request);
    return toResponse(vaults.save(vault));
  }

  @Transactional
  public void delete(AppUser user, UUID id) {
    RemoteVault vault = findOwned(user, id);
    vault.setDeletedAt(Instant.now());
    vaults.save(vault);
  }

  private RemoteVault findOwned(AppUser user, UUID id) {
    return vaults.findByIdAndUserAndDeletedAtIsNull(id, user)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Boveda remota no encontrada."));
  }

  private void apply(RemoteVault vault, VaultRequest request) {
    vault.setClientVaultId(request.clientVaultId().trim());
    vault.setDisplayName(request.displayName().trim());
    vault.setEncryptedPayload(request.encryptedPayload());
    vault.setPayloadVersion(request.payloadVersion());
  }

  private void validatePayloadSize(String encryptedPayload) {
    if (encryptedPayload.getBytes(StandardCharsets.UTF_8).length > maxEncryptedPayloadBytes) {
      throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "El payload cifrado supera el tamano permitido.");
    }
  }

  private VaultResponse toResponse(RemoteVault vault) {
    return new VaultResponse(
        vault.getId(),
        vault.getClientVaultId(),
        vault.getDisplayName(),
        vault.getEncryptedPayload(),
        vault.getPayloadVersion(),
        vault.getCreatedAt(),
        vault.getUpdatedAt(),
        vault.getDeletedAt()
    );
  }
}
