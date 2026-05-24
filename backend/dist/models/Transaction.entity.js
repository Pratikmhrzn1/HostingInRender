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
exports.Transaction = void 0;
const typeorm_1 = require("typeorm");
const User_entity_1 = require("./User.entity");
const Game_entity_1 = require("./Game.entity");
const types_1 = require("@/types");
let Transaction = class Transaction {
};
exports.Transaction = Transaction;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Transaction.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Transaction.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_entity_1.User, (user) => user.transactions),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", User_entity_1.User)
], Transaction.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Transaction.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Transaction.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Transaction.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Transaction.prototype, "balanceBefore", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Transaction.prototype, "balanceAfter", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: types_1.TransactionStatus.PENDING }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Transaction.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Transaction.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Transaction.prototype, "paymentGatewayId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Transaction.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Transaction.prototype, "gameId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Game_entity_1.Game, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'gameId' }),
    __metadata("design:type", Game_entity_1.Game)
], Transaction.prototype, "game", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { nullable: true }),
    __metadata("design:type", Object)
], Transaction.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Date)
], Transaction.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Transaction.prototype, "updatedAt", void 0);
exports.Transaction = Transaction = __decorate([
    (0, typeorm_1.Entity)('transactions')
], Transaction);
