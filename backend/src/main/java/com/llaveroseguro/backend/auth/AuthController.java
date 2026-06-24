package com.llaveroseguro.backend.auth;

import com.llaveroseguro.backend.audit.AuditService;
import com.llaveroseguro.backend.auth.AuthDtos.AuthResponse;
import com.llaveroseguro.backend.auth.AuthDtos.ChangePasswordRequest;
import com.llaveroseguro.backend.auth.AuthDtos.LoginRequest;
import com.llaveroseguro.backend.auth.AuthDtos.RegisterRequest;
import com.llaveroseguro.backend.auth.AuthDtos.UserResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final AuthService authService;
  private final AuditService auditService;

  public AuthController(AuthService authService, AuditService auditService) {
    this.authService = authService;
    this.auditService = auditService;
  }

  @PostMapping("/register")
  @ResponseStatus(HttpStatus.CREATED)
  public AuthResponse register(@Valid @RequestBody RegisterRequest request, HttpServletRequest servletRequest) {
    AuthResponse response = authService.register(request);
    auditService.record(null, "AUTH_REGISTER", servletRequest);
    return response;
  }

  @PostMapping("/login")
  public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
    AuthResponse response = authService.login(request);
    auditService.record(null, "AUTH_LOGIN", servletRequest);
    return response;
  }

  @GetMapping("/me")
  public UserResponse me(@AuthenticationPrincipal AuthenticatedUser user) {
    return authService.me(user.user());
  }

  @PostMapping("/password")
  public AuthResponse changePassword(
      @AuthenticationPrincipal AuthenticatedUser user,
      @Valid @RequestBody ChangePasswordRequest request,
      HttpServletRequest servletRequest
  ) {
    AuthResponse response = authService.changePassword(user, request);
    auditService.record(user.user(), "AUTH_PASSWORD_CHANGE", servletRequest);
    return response;
  }
}
