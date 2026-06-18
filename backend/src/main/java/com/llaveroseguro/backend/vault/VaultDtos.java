package com.llaveroseguro.backend.vault;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public class VaultDtos {
  public record VaultRequest(
      @NotBlank(message = "clientVaultId es obligatorio.") @Size(max = 120, message = "clientVaultId no puede superar 120 caracteres.") String clientVaultId,
      @NotBlank(message = "El nombre de la boveda es obligatorio.") @Size(max = 120, message = "El nombre no puede superar 120 caracteres.") String displayName,
      @NotBlank(message = "encryptedPayload es obligatorio.") String encryptedPayload,
      @NotNull(message = "payloadVersion es obligatorio.") @Min(value = 1, message = "payloadVersion debe ser mayor que cero.") @Max(value = 1000, message = "payloadVersion no es valido.") Integer payloadVersion
  ) {}

  public record VaultResponse(
      UUID id,
      String clientVaultId,
      String displayName,
      String encryptedPayload,
      Integer payloadVersion,
      Instant createdAt,
      Instant updatedAt,
      Instant deletedAt
  ) {}
}
