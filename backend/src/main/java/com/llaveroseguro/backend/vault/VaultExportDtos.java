package com.llaveroseguro.backend.vault;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class VaultExportDtos {
  private VaultExportDtos() {}

  public record ExportRow(
      @NotBlank @Size(max = 120) String vault,
      @NotBlank @Size(max = 500) String title,
      @Size(max = 2000) String website,
      @Size(max = 500) String username,
      @Size(max = 2000) String password,
      @Size(max = 120) String category,
      @Size(max = 10000) String notes,
      @Size(max = 80) String createdAt,
      @Size(max = 80) String updatedAt
  ) {}

  public record ExcelExportRequest(
      @NotBlank(message = "El nombre del archivo es obligatorio.") @Size(max = 120) String fileName,
      @NotNull(message = "Las filas de exportación son obligatorias.") List<@Valid ExportRow> rows
  ) {}
}
