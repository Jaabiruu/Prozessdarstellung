"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("@nestjs/graphql");
const user_role_enum_1 = require("../enums/user-role.enum");
(0, graphql_1.registerEnumType)(user_role_enum_1.UserRole, {
    name: 'UserRole',
    description: 'User role enumeration for pharmaceutical system',
    valuesMap: {
        OPERATOR: {
            description: 'Basic operator with limited access to production data',
        },
        MANAGER: {
            description: 'Manager with extended access to production management',
        },
        QUALITY_ASSURANCE: {
            description: 'Quality assurance role with approval authority',
        },
        ADMIN: {
            description: 'System administrator with full access',
        },
    },
});
//# sourceMappingURL=user-role.scalar.js.map