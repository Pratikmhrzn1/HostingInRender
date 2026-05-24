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
exports.WalletLoadRequest = exports.PaymentMethod = exports.LoadRequestStatus = void 0;
const typeorm_1 = require("typeorm");
const User_entity_1 = require("./User.entity");
const Wallet_entity_1 = require("./Wallet.entity");
var LoadRequestStatus;
(function (LoadRequestStatus) {
    LoadRequestStatus["PENDING"] = "PENDING";
    LoadRequestStatus["APPROVED"] = "APPROVED";
    LoadRequestStatus["REJECTED"] = "REJECTED";
    LoadRequestStatus["CANCELLED"] = "CANCELLED";
})(LoadRequestStatus || (exports.LoadRequestStatus = LoadRequestStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["BANK_TRANSFER"] = "BANK_TRANSFER";
    PaymentMethod["CARD"] = "CARD";
    PaymentMethod["MOBILE_MONEY"] = "MOBILE_MONEY";
    PaymentMethod["OTHER"] = "OTHER";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
let WalletLoadRequest = class WalletLoadRequest {
};
exports.WalletLoadRequest = WalletLoadRequest;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], WalletLoadRequest.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], WalletLoadRequest.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], WalletLoadRequest.prototype, "walletId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", User_entity_1.User)
], WalletLoadRequest.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Wallet_entity_1.Wallet, (wallet) => wallet.loadRequests),
    (0, typeorm_1.JoinColumn)({ name: 'walletId' }),
    __metadata("design:type", Wallet_entity_1.Wallet)
], WalletLoadRequest.prototype, "wallet", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], WalletLoadRequest.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'USD' }),
    __metadata("design:type", String)
], WalletLoadRequest.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PaymentMethod,
        default: PaymentMethod.BANK_TRANSFER,
    }),
    __metadata("design:type", String)
], WalletLoadRequest.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WalletLoadRequest.prototype, "transactionReference", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], WalletLoadRequest.prototype, "userNote", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WalletLoadRequest.prototype, "proofImageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: LoadRequestStatus,
        default: LoadRequestStatus.PENDING,
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], WalletLoadRequest.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WalletLoadRequest.prototype, "reviewedBy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'reviewedBy' }),
    __metadata("design:type", User_entity_1.User)
], WalletLoadRequest.prototype, "reviewer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], WalletLoadRequest.prototype, "reviewedAt", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], WalletLoadRequest.prototype, "adminRemark", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], WalletLoadRequest.prototype, "rejectionReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], WalletLoadRequest.prototype, "resubmissionCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WalletLoadRequest.prototype, "originalRequestId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], WalletLoadRequest.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], WalletLoadRequest.prototype, "updatedAt", void 0);
exports.WalletLoadRequest = WalletLoadRequest = __decorate([
    (0, typeorm_1.Entity)('wallet_load_requests'),
    (0, typeorm_1.Index)(['userId', 'status']),
    (0, typeorm_1.Index)(['status', 'createdAt'])
], WalletLoadRequest);
