"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtConfig = void 0;
class JwtConfig {
    secret;
    expiresIn;
    constructor(config) {
        this.secret = config.secret;
        this.expiresIn = config.expiresIn;
    }
    toJSON() {
        return {
            expiresIn: this.expiresIn,
            secret: '[REDACTED]',
        };
    }
}
exports.JwtConfig = JwtConfig;
//# sourceMappingURL=config.interface.js.map