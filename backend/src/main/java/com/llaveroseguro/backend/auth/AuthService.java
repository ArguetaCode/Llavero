package com.llaveroseguro.backend.auth;

import com.llaveroseguro.backend.auth.AuthDtos.AuthResponse;
import com.llaveroseguro.backend.auth.AuthDtos.ChangePasswordRequest;
import com.llaveroseguro.backend.auth.AuthDtos.LoginRequest;
import com.llaveroseguro.backend.auth.AuthDtos.RegisterRequest;
import com.llaveroseguro.backend.auth.AuthDtos.UserResponse;
import com.llaveroseguro.backend.common.ApiException;
import com.llaveroseguro.backend.user.AppUser;
import com.llaveroseguro.backend.user.AppUserRepository;
import com.llaveroseguro.backend.user.UserStatus;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
  private final AppUserRepository users;
  private final PasswordEncoder passwordEncoder;
  private final AuthenticationManager authenticationManager;
  private final JwtService jwtService;

  public AuthService(
      AppUserRepository users,
      PasswordEncoder passwordEncoder,
      AuthenticationManager authenticationManager,
      JwtService jwtService
  ) {
    this.users = users;
    this.passwordEncoder = passwordEncoder;
    this.authenticationManager = authenticationManager;
    this.jwtService = jwtService;
  }

  @Transactional
  public AuthResponse register(RegisterRequest request) {
    String email = normalizeEmail(request.email());
    if (users.existsByEmail(email)) {
      throw new ApiException(HttpStatus.CONFLICT, "Ya existe un perfil remoto con ese email.");
    }

    AppUser user = new AppUser();
    user.setEmail(email);
    user.setDisplayName(request.displayName().trim());
    user.setPasswordHash(passwordEncoder.encode(request.password()));
    user.setStatus(UserStatus.ACTIVE);
    AppUser saved = users.save(user);
    AuthenticatedUser authenticatedUser = new AuthenticatedUser(saved);
    return new AuthResponse(jwtService.createToken(authenticatedUser), toResponse(saved));
  }

  @Transactional
  public AuthResponse login(LoginRequest request) {
    String email = normalizeEmail(request.email());
    authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, request.password()));
    AppUser user = users.findByEmail(email).orElseThrow(() -> new BadCredentialsException("Credenciales invalidas."));
    user.setLastLoginAt(Instant.now());
    AppUser saved = users.save(user);
    return new AuthResponse(jwtService.createToken(new AuthenticatedUser(saved)), toResponse(saved));
  }

  public UserResponse me(AppUser user) {
    return toResponse(user);
  }

  @Transactional
  public AuthResponse changePassword(AuthenticatedUser authenticatedUser, ChangePasswordRequest request) {
    AppUser user = users.findById(authenticatedUser.id())
        .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Sesión remota inválida."));
    if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "La contraseña actual de la cuenta no es correcta.");
    }
    if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "La nueva contraseña debe ser diferente de la actual.");
    }

    user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
    user.setTokenVersion(user.getTokenVersion() + 1);
    AppUser saved = users.save(user);
    return new AuthResponse(jwtService.createToken(new AuthenticatedUser(saved)), toResponse(saved));
  }

  private String normalizeEmail(String email) {
    return email.toLowerCase().trim();
  }

  private UserResponse toResponse(AppUser user) {
    return new UserResponse(
        user.getId(),
        user.getEmail(),
        user.getDisplayName(),
        user.getCreatedAt(),
        user.getUpdatedAt(),
        user.getLastLoginAt(),
        user.getStatus().name()
    );
  }
}
