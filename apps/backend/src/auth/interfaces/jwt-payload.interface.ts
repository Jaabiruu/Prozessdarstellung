export interface JwtPayload {
  readonly sub: string;
  readonly email: string;
  readonly role: string;
  readonly jti: string;
  readonly iat?: number;
  readonly exp?: number;
}

export interface AuthenticationResult {
  readonly user: {
    readonly id: string;
    readonly email: string;
    readonly firstName: string | null;
    readonly lastName: string | null;
    readonly role: string;
  };
  readonly accessToken: string;
}
