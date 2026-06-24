package com.llaveroseguro.backend.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public class AuthDtos {
  public record RegisterRequest(
      @Email(message = "El email no es valido.") @NotBlank(message = "El email es obligatorio.") String email,
      @NotBlank(message = "El nombre es obligatorio.") @Size(max = 120, message = "El nombre no puede superar 120 caracteres.") String displayName,
      @NotBlank(message = "La contraseña remota es obligatoria.") @Size(min = 10, max = 128, message = "La contraseña remota debe tener entre 10 y 128 caracteres.") String password
  ) {}

  public record LoginRequest(
      @Email(message = "El email no es valido.") @NotBlank(message = "El email es obligatorio.") String email,
      @NotBlank(message = "La contraseña remota es obligatoria.") String password
  ) {}

  public record ChangePasswordRequest(
      @NotBlank(message = "La contraseña actual es obligatoria.") String currentPassword,
      @NotBlank(message = "La nueva contraseña es obligatoria.") @Size(min = 10, max = 128, message = "La nueva contraseña debe tener entre 10 y 128 caracteres.") String newPassword
  ) {}

  public record AuthResponse(String token, UserResponse user) {}

  public record UserResponse(UUID id, String email, String displayName, Instant createdAt, Instant updatedAt, Instant lastLoginAt, String status) {}
}
