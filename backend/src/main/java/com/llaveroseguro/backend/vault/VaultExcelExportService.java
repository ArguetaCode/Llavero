package com.llaveroseguro.backend.vault;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.springframework.stereotype.Service;

import com.llaveroseguro.backend.vault.VaultExportDtos.ExcelExportRequest;

@Service
public class VaultExcelExportService {
  public byte[] generate(ExcelExportRequest request) {
    try (Workbook workbook = new HSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
      Sheet sheet = workbook.createSheet("Bóveda");
      Row header = sheet.createRow(0);
      String[] headers = {"Bóveda", "Título", "Sitio / script", "Usuario", "Contraseña", "Categoría", "Notas", "Creada", "Actualizada"};
      for (int column = 0; column < headers.length; column++) setCell(header.createCell(column), headers[column]);
      for (int index = 0; index < request.rows().size(); index++) {
        var data = request.rows().get(index);
        Row row = sheet.createRow(index + 1);
        String[] values = {data.vault(), data.title(), data.website(), data.username(), data.password(), data.category(), data.notes(), data.createdAt(), data.updatedAt()};
        for (int column = 0; column < values.length; column++) setCell(row.createCell(column), values[column] == null ? "" : values[column]);
      }
      for (int column = 0; column < headers.length; column++) sheet.setColumnWidth(column, column == 6 ? 60 * 256 : 28 * 256);
      workbook.write(output);
      return output.toByteArray();
    } catch (IOException exception) {
      throw new IllegalStateException("No se pudo generar el archivo Excel.", exception);
    }
  }

  private void setCell(Cell cell, String value) {
    cell.setCellValue(value);
  }
}
