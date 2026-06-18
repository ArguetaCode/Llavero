package com.llaveroseguro.backend.common;

import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler(ApiException.class)
  ResponseEntity<ApiError> handleApiException(ApiException exception) {
    return ResponseEntity.status(exception.status()).body(new ApiError(exception.getMessage(), Instant.now()));
  }

  @ExceptionHandler(BadCredentialsException.class)
  ResponseEntity<ApiError> handleBadCredentials() {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiError("Credenciales invalidas.", Instant.now()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException exception) {
    String message = exception.getBindingResult().getFieldErrors().stream()
        .findFirst()
        .map(FieldError::getDefaultMessage)
        .orElse("La solicitud no es valida.");
    return ResponseEntity.badRequest().body(new ApiError(message, Instant.now()));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<ApiError> handleDataIntegrity() {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(new ApiError("La solicitud entra en conflicto con datos existentes.", Instant.now()));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ApiError> handleUnexpected() {
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(new ApiError("No se pudo procesar la solicitud.", Instant.now()));
  }
}
