export interface UserDTO {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface AuthTokensDTO {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
}

export interface AuthResponseDTO {
  user: UserDTO;
  tokens: AuthTokensDTO;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}
