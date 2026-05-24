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
exports.Game = void 0;
const typeorm_1 = require("typeorm");
const GameHistory_entity_1 = require("./GameHistory.entity");
const types_1 = require("@/types");
let Game = class Game {
};
exports.Game = Game;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Game.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Game.prototype, "gameType", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Game.prototype, "tableId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Game.prototype, "roomType", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Game.prototype, "bootAmount", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], Game.prototype, "maxPlayers", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb'),
    __metadata("design:type", Array)
], Game.prototype, "currentPlayers", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb'),
    __metadata("design:type", Object)
], Game.prototype, "gameState", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { nullable: true }),
    __metadata("design:type", Object)
], Game.prototype, "result", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], Game.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], Game.prototype, "endedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => GameHistory_entity_1.GameHistory, (history) => history.game),
    __metadata("design:type", Array)
], Game.prototype, "histories", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Date)
], Game.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Game.prototype, "updatedAt", void 0);
exports.Game = Game = __decorate([
    (0, typeorm_1.Entity)('games')
], Game);
