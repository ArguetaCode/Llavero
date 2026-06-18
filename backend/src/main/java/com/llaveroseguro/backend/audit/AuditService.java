package com.llaveroseguro.backend.audit;

import com.llaveroseguro.backend.user.AppUser;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;

@Service
public class AuditService {
  private final AuditEventRepository auditEvents;

  public AuditService(AuditEventRepository auditEvents) {
    this.auditEvents = auditEvents;
  }

  public void record(AppUser user, String eventType, HttpServletRequest request) {
    AuditEvent event = new AuditEvent();
    event.setUser(user);
    event.setEventType(eventType);
    event.setIpAddress(truncate(request.getRemoteAddr(), 64));
    event.setUserAgent(truncate(request.getHeader("User-Agent"), 512));
    auditEvents.save(event);
  }

  private String truncate(String value, int maxLength) {
    if (value == null) return null;
    return value.length() <= maxLength ? value : value.substring(0, maxLength);
  }
}
