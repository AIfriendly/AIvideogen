/**
 * Security Test Payloads
 *
 * Malicious payloads for security testing (SQL injection, XSS, etc.).
 * Based on OWASP Top 10 attack vectors.
 *
 * IMPORTANT: These are for TESTING ONLY. Never use in production code.
 */

/**
 * SQL Injection Payloads
 *
 * Common SQL injection attack vectors to test input sanitization
 * and parameterized query protection.
 */
export const SQL_INJECTION_PAYLOADS = [
  // Basic SQL injection
  "' OR '1'='1",
  "'; DROP TABLE projects; --",
  "' UNION SELECT * FROM projects --",
  "1' OR 1=1 --",

  // Advanced SQL injection
  "' OR 1=1#",
  "admin'--",
  "' OR 'x'='x",
  "1' UNION ALL SELECT NULL,NULL,NULL--",

  // Stacked queries
  "'; DELETE FROM projects WHERE id='1",
  "1; UPDATE projects SET name='hacked' WHERE 1=1--",

  // Time-based blind SQL injection
  "1' AND SLEEP(5)--",
  "1' WAITFOR DELAY '00:00:05'--",
] as const;

/**
 * Cross-Site Scripting (XSS) Payloads
 *
 * XSS attack vectors to test output escaping and content security policy.
 */
export const XSS_PAYLOADS = [
  // Basic XSS
  "<script>alert('XSS')</script>",
  '<img src=x onerror=alert("XSS")>',
  "<svg onload=alert('XSS')>",

  // Event handler XSS
  '<body onload=alert("XSS")>',
  '<input onfocus=alert("XSS") autofocus>',
  '<marquee onstart=alert("XSS")>',

  // Advanced XSS
  "javascript:alert('XSS')",
  "<iframe src='javascript:alert(\"XSS\")'></iframe>",
  "<object data='javascript:alert(\"XSS\")'></object>",

  // Encoded XSS
  "%3Cscript%3Ealert('XSS')%3C/script%3E",
  "&#60;script&#62;alert('XSS')&#60;/script&#62;",

  // DOM-based XSS
  "<img src=x:alert(alt) onerror=eval(src) alt=XSS>",
] as const;

/**
 * Malformed UUID Payloads
 *
 * Invalid UUID formats to test UUID validation and error handling.
 */
export const MALFORMED_UUID_PAYLOADS = [
  // Not UUIDs at all
  "'; DROP TABLE projects; --",
  "<script>alert('XSS')</script>",
  "../../etc/passwd",

  // Malformed UUIDs
  "not-a-uuid",
  "12345",
  "00000000-0000-0000-0000-000000000000", // All zeros (edge case)
  "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",

  // UUID-like but invalid
  "123e4567-e89b-12d3-a456-42661417400", // Too short
  "123e4567-e89b-12d3-a456-4266141740000", // Too long
  "123e4567_e89b_12d3_a456_426614174000", // Wrong separator
  "123e4567-e89b-12d3-a456", // Incomplete
] as const;

/**
 * Path Traversal Payloads
 *
 * Directory traversal attack vectors to test path sanitization.
 */
export const PATH_TRAVERSAL_PAYLOADS = [
  "../../etc/passwd",
  "..\\..\\windows\\system32\\config\\sam",
  "....//....//....//etc/passwd",
  "%2e%2e%2f%2e%2e%2fetc%2fpasswd",
] as const;

/**
 * Command Injection Payloads
 *
 * OS command injection vectors to test command execution prevention.
 */
export const COMMAND_INJECTION_PAYLOADS = [
  "; ls -la",
  "| cat /etc/passwd",
  "& dir",
  "`whoami`",
  "$(ls -la)",
] as const;

/**
 * Get all security payloads grouped by type
 */
export const SECURITY_PAYLOADS = {
  sqlInjection: SQL_INJECTION_PAYLOADS,
  xss: XSS_PAYLOADS,
  malformedUuid: MALFORMED_UUID_PAYLOADS,
  pathTraversal: PATH_TRAVERSAL_PAYLOADS,
  commandInjection: COMMAND_INJECTION_PAYLOADS,
} as const;

/**
 * Type guard to check if a payload is dangerous
 * (All payloads in this file are dangerous by definition)
 */
export function isDangerousPayload(payload: string): boolean {
  const allPayloads = [
    ...SQL_INJECTION_PAYLOADS,
    ...XSS_PAYLOADS,
    ...MALFORMED_UUID_PAYLOADS,
    ...PATH_TRAVERSAL_PAYLOADS,
    ...COMMAND_INJECTION_PAYLOADS,
  ];

  return allPayloads.includes(payload as any);
}
