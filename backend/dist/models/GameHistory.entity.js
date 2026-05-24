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
exports.GameHistory = void 0;
const typeorm_1 = require("typeorm");
const Game_entity_1 = require("./Game.entity");
const types_1 = require("@/types");
let GameHistory = class GameHistory {
};
exports.GameHistory = GameHistory;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], GameHistory.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], GameHistory.prototype, "gameId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Game_entity_1.Game, (game) => game.histories),
    (0, typeorm_1.JoinColumn)({ name: 'gameId' }),
    __metadata("design:type", Game_entity_1.Game)
], GameHistory.prototype, "game", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], GameHistory.prototype, "gameType", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb'),
    __metadata("design:type", Array)
], GameHistory.prototype, "players", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], GameHistory.prototype, "pot", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], GameHistory.prototype, "rake", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], GameHistory.prototype, "winner", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb'),
    __metadata("design:type", Array)
], GameHistory.prototype, "actions", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], GameHistory.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], GameHistory.prototype, "endedAt", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], GameHistory.prototype, "duration", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Date)
], GameHistory.prototype, "createdAt", void 0);
exports.GameHistory = GameHistory = __decorate([
    (0, typeorm_1.Entity)('game_history')
], GameHistory);
