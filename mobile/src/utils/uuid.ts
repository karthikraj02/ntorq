/**
 * RFC 4122 version-4 UUID for record ids. These ids only need to be unique per
 * user (the server scopes every record to its owner), not unguessable, so
 * Math.random is sufficient and avoids a native crypto dependency.
 */
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = Math.floor(Math.random() * 16);
    // 'y' must be 8, 9, a or b (the RFC 4122 variant bits).
    const value = char === 'x' ? random : (random % 4) + 8;
    return value.toString(16);
  });
}
