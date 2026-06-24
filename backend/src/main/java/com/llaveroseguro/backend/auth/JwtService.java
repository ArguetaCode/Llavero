package com.llaveroseguro.backend.auth;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.llaveroseguro.backend.config.AppProperties;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
  private static final Base64.Encoder BASE64_URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
  private static final Base64.Decoder BASE64_URL_DECODER = Base64.getUrlDecoder();

  private final ObjectMapper objectMapper;
  private final byte[] secret;
  private final long expirationMinutes;

  public JwtService(ObjectMapper objectMapper, AppProperties properties) {
    this.objectMapper = objectMapper;
    this.secret = properties.security().jwtSecret().getBytes(StandardCharsets.UTF_8);
    this.expirationMinutes = properties.security().jwtExpirationMinutes();
  }

  public String createToken(AuthenticatedUser user) {
    Instant now = Instant.now();
    Map<String, Object> header = Map.of("alg", "HS256", "typ", "JWT");
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("sub", user.getUsername());
    payload.put("uid", user.id().toString());
    payload.put("ver", user.user().getTokenVersion());
    payload.put("iat", now.getEpochSecond());
    payload.put("exp", now.plusSeconds(expirationMinutes * 60).getEpochSecond());

    String encodedHeader = encodeJson(header);
    String encodedPayload = encodeJson(payload);
    String unsignedToken = encodedHeader + "." + encodedPayload;
    return unsignedToken + "." + sign(unsignedToken);
  }

  public String subject(String token) {
    return claims(token).subject();
  }

  public TokenClaims claims(String token) {
    String[] parts = token.split("\\.");
    if (parts.length != 3) throw new IllegalArgumentException("Token invalido.");

    String expectedSignature = sign(parts[0] + "." + parts[1]);
    if (!constantTimeEquals(expectedSignature, parts[2])) throw new IllegalArgumentException("Token invalido.");

    Map<String, Object> payload = decodeJson(parts[1]);
    Object expiration = payload.get("exp");
    if (!(expiration instanceof Number exp) || Instant.now().getEpochSecond() >= exp.longValue()) {
      throw new IllegalArgumentException("Token expirado.");
    }

    Object subject = payload.get("sub");
    if (!(subject instanceof String email) || email.isBlank()) throw new IllegalArgumentException("Token invalido.");
    Object version = payload.get("ver");
    int tokenVersion = version instanceof Number number ? number.intValue() : 0;
    return new TokenClaims(email, tokenVersion);
  }

  public record TokenClaims(String subject, int tokenVersion) {}

  private String encodeJson(Map<String, Object> data) {
    try {
      return BASE64_URL_ENCODER.encodeToString(objectMapper.writeValueAsBytes(data));
    } catch (Exception exception) {
      throw new IllegalStateException("No se pudo crear el token.", exception);
    }
  }

  private Map<String, Object> decodeJson(String value) {
    try {
      byte[] json = BASE64_URL_DECODER.decode(value);
      return objectMapper.readValue(json, new TypeReference<>() {});
    } catch (Exception exception) {
      throw new IllegalArgumentException("Token invalido.", exception);
    }
  }

  private String sign(String value) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret, "HmacSHA256"));
      return BASE64_URL_ENCODER.encodeToString(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception exception) {
      throw new IllegalStateException("No se pudo firmar el token.", exception);
    }
  }

  private boolean constantTimeEquals(String left, String right) {
    byte[] leftBytes = left.getBytes(StandardCharsets.UTF_8);
    byte[] rightBytes = right.getBytes(StandardCharsets.UTF_8);
    if (leftBytes.length != rightBytes.length) return false;
    int result = 0;
    for (int index = 0; index < leftBytes.length; index++) {
      result |= leftBytes[index] ^ rightBytes[index];
    }
    return result == 0;
  }
}
