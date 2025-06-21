"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditAction = exports.ApprovalState = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["OPERATOR"] = "OPERATOR";
    UserRole["MANAGER"] = "MANAGER";
    UserRole["QUALITY_ASSURANCE"] = "QUALITY_ASSURANCE";
    UserRole["ADMIN"] = "ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
var ApprovalState;
(function (ApprovalState) {
    ApprovalState["DRAFT"] = "DRAFT";
    ApprovalState["PENDING_APPROVAL"] = "PENDING_APPROVAL";
    ApprovalState["APPROVED"] = "APPROVED";
    ApprovalState["REJECTED"] = "REJECTED";
})(ApprovalState || (exports.ApprovalState = ApprovalState = {}));
var AuditAction;
(function (AuditAction) {
    AuditAction["CREATE"] = "CREATE";
    AuditAction["UPDATE"] = "UPDATE";
    AuditAction["DELETE"] = "DELETE";
    AuditAction["APPROVE"] = "APPROVE";
    AuditAction["REJECT"] = "REJECT";
    AuditAction["VIEW"] = "VIEW";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
//# sourceMappingURL=user-role.enum.js.map