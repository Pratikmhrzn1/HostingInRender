"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserDetail = void 0;
const typeorm_1 = require("typeorm");
const User_entity_1 = require("./User.entity");
const types_1 = require("@/types");
let UserDetail = class UserDetail {
};
exports.UserDetail = UserDetail;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], UserDetail.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', unique: true }),
    (0, typeorm_1.Index)('IDX_user_detail_userId'),
    __metadata("design:type", String)
], UserDetail.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => User_entity_1.User, (user) => user.userDetail),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", User_entity_1.User)
], UserDetail.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { nullable: true }),
    __metadata("design:type", Object)
], UserDetail.prototype, "documents", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: types_1.UserDetailStatus.PENDING, nullable: false }),
    (0, typeorm_1.Index)('IDX_user_detail_status'),
    __metadata("design:type", String)
], UserDetail.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], UserDetail.prototype, "rejectionReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], UserDetail.prototype, "verifiedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], UserDetail.prototype, "verifiedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], UserDetail.prototype, "submittedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], UserDetail.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], UserDetail.prototype, "updatedAt", void 0);
exports.UserDetail = UserDetail = __decorate([
    (0, typeorm_1.Entity)('user_details')
], UserDetail);
