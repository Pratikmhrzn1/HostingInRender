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
exports.WalletTransaction = exports.TransactionSource = exports.TransactionType = void 0;
const typeorm_1 = require("typeorm");
const User_entity_1 = require("./User.entity");
const Wallet_entity_1 = require("./Wallet.entity");
const WalletLoadRequest_entity_1 = require("./WalletLoadRequest.entity");
var TransactionType;
(function (TransactionType) {
    TransactionType["CREDIT"] = "CREDIT";
    TransactionType["DEBIT"] = "DEBIT";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var TransactionSource;
(function (TransactionSource) {
    TransactionSource["WALLET_LOAD"] = "WALLET_LOAD";
    TransactionSource["BONUS"] = "BONUS";
    TransactionSource["REFUND"] = "REFUND";
    TransactionSource["PURCHASE"] = "PURCHASE";
    TransactionSource["WITHDRAWAL"] = "WITHDRAWAL";
    TransactionSource["ADMIN_ADJUSTMENT"] = "ADMIN_ADJUSTMENT";
})(TransactionSource || (exports.TransactionSource = TransactionSource = {}));
let WalletTransaction = class WalletTransaction {
};
exports.WalletTransaction = WalletTransaction;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], WalletTransaction.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], WalletTransaction.prototype, "walletId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], WalletTransaction.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Wallet_entity_1.Wallet, (wallet) => wallet.transactions),
    (0, typeorm_1.JoinColumn)({ name: 'walletId' }),
    __metadata("design:type", Wallet_entity_1.Wallet)
], WalletTransaction.prototype, "wallet", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", User_entity_1.User)
], WalletTransaction.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: TransactionType,
    }),
    __metadata("design:type", String)
], WalletTransaction.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: TransactionSource,
    }),
    __metadata("design:type", String)
], WalletTransaction.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], WalletTransaction.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], WalletTransaction.prototype, "balanceBefore", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], WalletTransaction.prototype, "balanceAfter", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WalletTransaction.prototype, "loadRequestId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => WalletLoadRequest_entity_1.WalletLoadRequest),
    (0, typeorm_1.JoinColumn)({ name: 'loadRequestId' }),
    __metadata("design:type", WalletLoadRequest_entity_1.WalletLoadRequest)
], WalletTransaction.prototype, "loadRequest", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], WalletTransaction.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], WalletTransaction.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], WalletTransaction.prototype, "createdAt", void 0);
exports.WalletTransaction = WalletTransaction = __decorate([
    (0, typeorm_1.Entity)('wallet_transactions'),
    (0, typeorm_1.Index)(['walletId', 'createdAt']),
    (0, typeorm_1.Index)(['userId', 'createdAt'])
], WalletTransaction);
