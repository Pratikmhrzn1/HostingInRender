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
exports.User = void 0;
const typeorm_1 = require("typeorm");
const Wallet_entity_1 = require("./Wallet.entity");
const Transaction_entity_1 = require("./Transaction.entity");
const UserDetail_entity_1 = require("./UserDetail.entity");
const types_1 = require("@/types");
const KYC_entity_1 = require("./KYC.entity");
let User = class User {
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "avatar", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "isVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "isUserDetailVerified", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "deviceInfo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: types_1.UserStatus.ACTIVE }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], User.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => Wallet_entity_1.Wallet, (wallet) => wallet.user),
    __metadata("design:type", Wallet_entity_1.Wallet)
], User.prototype, "wallet", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Transaction_entity_1.Transaction, (transaction) => transaction.user),
    __metadata("design:type", Array)
], User.prototype, "transactions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: types_1.UserRole.USER }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => UserDetail_entity_1.UserDetail, (userDetail) => userDetail.user),
    __metadata("design:type", UserDetail_entity_1.UserDetail)
], User.prototype, "userDetail", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => KYC_entity_1.KYC, (kyc) => kyc.user),
    __metadata("design:type", KYC_entity_1.KYC)
], User.prototype, "kyc", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('users')
], User);
