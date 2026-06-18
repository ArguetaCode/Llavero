package com.llaveroseguro.backend.vault;

import com.llaveroseguro.backend.user.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = "remote_vaults",
    uniqueConstraints = @UniqueConstraint(name = "remote_vaults_user_client_vault_unique", columnNames = {"user_id", "client_vault_id"})
)
public class RemoteVault {
  @Id
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private AppUser user;

  @Column(name = "client_vault_id", nullable = false, length = 120)
  private String clientVaultId;

  @Column(name = "display_name", nullable = false, length = 120)
  private String displayName;

  @Column(name = "encrypted_payload", nullable = false, columnDefinition = "TEXT")
  private String encryptedPayload;

  @Column(name = "payload_version", nullable = false)
  private Integer payloadVersion;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Column(name = "deleted_at")
  private Instant deletedAt;

  @PrePersist
  void prePersist() {
    Instant now = Instant.now();
    if (id == null) id = UUID.randomUUID();
    if (createdAt == null) createdAt = now;
    if (updatedAt == null) updatedAt = now;
  }

  @PreUpdate
  void preUpdate() {
    updatedAt = Instant.now();
  }

  public UUID getId() {
    return id;
  }

  public AppUser getUser() {
    return user;
  }

  public void setUser(AppUser user) {
    this.user = user;
  }

  public String getClientVaultId() {
    return clientVaultId;
  }

  public void setClientVaultId(String clientVaultId) {
    this.clientVaultId = clientVaultId;
  }

  public String getDisplayName() {
    return displayName;
  }

  public void setDisplayName(String displayName) {
    this.displayName = displayName;
  }

  public String getEncryptedPayload() {
    return encryptedPayload;
  }

  public void setEncryptedPayload(String encryptedPayload) {
    this.encryptedPayload = encryptedPayload;
  }

  public Integer getPayloadVersion() {
    return payloadVersion;
  }

  public void setPayloadVersion(Integer payloadVersion) {
    this.payloadVersion = payloadVersion;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public Instant getDeletedAt() {
    return deletedAt;
  }

  public void setDeletedAt(Instant deletedAt) {
    this.deletedAt = deletedAt;
  }
}
