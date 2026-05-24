"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KYCStatus = exports.RoomType = exports.GamePhase = exports.UserDetailStatus = exports.UserRole = exports.UserStatus = exports.TransactionStatus = exports.TransactionCategory = exports.TransactionType = exports.GameType = void 0;
var GameType;
(function (GameType) {
    GameType["TEEN_PATTI"] = "TEEN_PATTI";
    GameType["MARRIAGE"] = "MARRIAGE";
    GameType["CHAAL_TEEN_PATTI"] = "CHAAL_TEEN_PATTI";
    GameType["FARAS"] = "FARAS";
    GameType["KITTI"] = "KITTI";
    GameType["LUDO"] = "LUDO";
    GameType["CALL_BREAK"] = "CALL_BREAK";
})(GameType || (exports.GameType = GameType = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["CREDIT"] = "CREDIT";
    TransactionType["DEBIT"] = "DEBIT";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var TransactionCategory;
(function (TransactionCategory) {
    TransactionCategory["ADD_MONEY"] = "ADD_MONEY";
    TransactionCategory["WITHDRAWAL"] = "WITHDRAWAL";
    TransactionCategory["GAME_ENTRY"] = "GAME_ENTRY";
    TransactionCategory["GAME_WIN"] = "GAME_WIN";
    TransactionCategory["GAME_LOSS"] = "GAME_LOSS";
    TransactionCategory["BONUS_CREDIT"] = "BONUS_CREDIT";
    TransactionCategory["BONUS_DEBIT"] = "BONUS_DEBIT";
    TransactionCategory["REFUND"] = "REFUND";
})(TransactionCategory || (exports.TransactionCategory = TransactionCategory = {}));
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["PENDING"] = "PENDING";
    TransactionStatus["COMPLETED"] = "COMPLETED";
    TransactionStatus["FAILED"] = "FAILED";
    TransactionStatus["CANCELLED"] = "CANCELLED";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "ACTIVE";
    UserStatus["SUSPENDED"] = "SUSPENDED";
    UserStatus["BANNED"] = "BANNED";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
var UserRole;
(function (UserRole) {
    UserRole["USER"] = "USER";
    UserRole["ADMIN"] = "ADMIN";
    UserRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    UserRole["AGENT"] = "AGENT";
})(UserRole || (exports.UserRole = UserRole = {}));
var UserDetailStatus;
(function (UserDetailStatus) {
    UserDetailStatus["DRAFT"] = "DRAFT";
    UserDetailStatus["PENDING"] = "PENDING";
    UserDetailStatus["VERIFIED"] = "VERIFIED";
    UserDetailStatus["APPROVED"] = "APPROVED";
    UserDetailStatus["REJECTED"] = "REJECTED";
    UserDetailStatus["CHANGES_REQUESTED"] = "CHANGES_REQUESTED";
})(UserDetailStatus || (exports.UserDetailStatus = UserDetailStatus = {}));
var GamePhase;
(function (GamePhase) {
    GamePhase["WAITING"] = "WAITING";
    GamePhase["DEALING"] = "DEALING";
    GamePhase["BETTING"] = "BETTING";
    GamePhase["SHOWDOWN"] = "SHOWDOWN";
    GamePhase["COMPLETED"] = "COMPLETED";
})(GamePhase || (exports.GamePhase = GamePhase = {}));
var RoomType;
(function (RoomType) {
    RoomType["PUBLIC"] = "PUBLIC";
    RoomType["PRIVATE"] = "PRIVATE";
    RoomType["TOURNAMENT"] = "TOURNAMENT";
})(RoomType || (exports.RoomType = RoomType = {}));
var KYCStatus;
(function (KYCStatus) {
    KYCStatus["PENDING"] = "PENDING";
    KYCStatus["APPROVED"] = "APPROVED";
    KYCStatus["REJECTED"] = "REJECTED";
})(KYCStatus || (exports.KYCStatus = KYCStatus = {}));
