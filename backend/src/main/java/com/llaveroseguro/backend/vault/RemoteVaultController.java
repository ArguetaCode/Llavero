package com.llaveroseguro.backend.vault;

import com.llaveroseguro.backend.auth.AuthenticatedUser;
import com.llaveroseguro.backend.vault.VaultDtos.VaultRequest;
import com.llaveroseguro.backend.vault.VaultDtos.VaultResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/vaults")
public class RemoteVaultController {
  private final RemoteVaultService vaultService;

  public RemoteVaultController(RemoteVaultService vaultService) {
    this.vaultService = vaultService;
  }

  @GetMapping
  public List<VaultResponse> list(@AuthenticationPrincipal AuthenticatedUser user) {
    return vaultService.list(user.user());
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public VaultResponse create(@AuthenticationPrincipal AuthenticatedUser user, @Valid @RequestBody VaultRequest request) {
    return vaultService.create(user.user(), request);
  }

  @GetMapping("/{id}")
  public VaultResponse get(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable UUID id) {
    return vaultService.get(user.user(), id);
  }

  @PutMapping("/{id}")
  public VaultResponse update(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable UUID id, @Valid @RequestBody VaultRequest request) {
    return vaultService.update(user.user(), id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable UUID id) {
    vaultService.delete(user.user(), id);
  }
}
