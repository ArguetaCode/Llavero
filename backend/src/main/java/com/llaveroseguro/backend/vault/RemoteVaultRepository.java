package com.llaveroseguro.backend.vault;

import com.llaveroseguro.backend.user.AppUser;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RemoteVaultRepository extends JpaRepository<RemoteVault, UUID> {
  List<RemoteVault> findAllByUserAndDeletedAtIsNullOrderByUpdatedAtDesc(AppUser user);

  Optional<RemoteVault> findFirstByUserAndDeletedAtIsNullOrderByUpdatedAtDesc(AppUser user);

  Optional<RemoteVault> findByIdAndUserAndDeletedAtIsNull(UUID id, AppUser user);
}
