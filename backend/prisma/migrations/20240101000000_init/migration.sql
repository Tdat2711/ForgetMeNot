-- backend/prisma/migrations/20240101000000_init/migration.sql
-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `avatar` VARCHAR(191) NULL DEFAULT '/assets/images/default-avatar.png',
    `role` ENUM('STUDENT', 'TEACHER', 'ADMIN') NOT NULL DEFAULT 'STUDENT',
    `darkMode` BOOLEAN NOT NULL DEFAULT true,
    `language` VARCHAR(191) NOT NULL DEFAULT 'vi',
    `emailNotifications` BOOLEAN NOT NULL DEFAULT true,
    `pushNotifications` BOOLEAN NOT NULL DEFAULT false,
    `studyReminders` BOOLEAN NOT NULL DEFAULT true,
    `twoFactorEnabled` BOOLEAN NOT NULL DEFAULT false,
    `twoFactorSecret` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `lastLoginAt` DATETIME(3) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_username_key`(`username`),
    INDEX `users_email_idx`(`email`),
    INDEX `users_username_idx`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `decks` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `color` VARCHAR(191) NOT NULL DEFAULT '#3B82F6',
    `icon` VARCHAR(191) NOT NULL DEFAULT '📚',
    `isFavorite` BOOLEAN NOT NULL DEFAULT false,
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `isArchived` BOOLEAN NOT NULL DEFAULT false,
    `examDate` DATETIME(3) NULL,
    `cramMode` BOOLEAN NOT NULL DEFAULT false,
    `cardCount` INTEGER NOT NULL DEFAULT 0,
    `newCards` INTEGER NOT NULL DEFAULT 0,
    `learningCards` INTEGER NOT NULL DEFAULT 0,
    `reviewCards` INTEGER NOT NULL DEFAULT 0,
    `lastStudied` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `decks_userId_idx`(`userId`),
    INDEX `decks_userId_isFavorite_idx`(`userId`, `isFavorite`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `flashcards` (
    `id` VARCHAR(191) NOT NULL,
    `deckId` VARCHAR(191) NOT NULL,
    `frontText` TEXT NOT NULL,
    `frontHtml` TEXT NULL,
    `backText` TEXT NOT NULL,
    `backHtml` TEXT NULL,
    `hint` TEXT NULL,
    `difficulty` ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL DEFAULT 'MEDIUM',
    `easeFactor` DOUBLE NOT NULL DEFAULT 2.5,
    `interval` INTEGER NOT NULL DEFAULT 0,
    `repetitions` INTEGER NOT NULL DEFAULT 0,
    `nextReview` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastReview` DATETIME(3) NULL,
    `totalReviews` INTEGER NOT NULL DEFAULT 0,
    `correctCount` INTEGER NOT NULL DEFAULT 0,
    `incorrectCount` INTEGER NOT NULL DEFAULT 0,
    `isAiGenerated` BOOLEAN NOT NULL DEFAULT false,
    `aiConfidence` DOUBLE NULL,
    `sourceFile` VARCHAR(191) NULL,
    `sourcePage` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `flashcards_deckId_idx`(`deckId`),
    INDEX `flashcards_nextReview_idx`(`nextReview`),
    INDEX `flashcards_deckId_nextReview_idx`(`deckId`, `nextReview`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `study_progress` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `deckId` VARCHAR(191) NOT NULL,
    `cardsStudied` INTEGER NOT NULL DEFAULT 0,
    `cardsLearned` INTEGER NOT NULL DEFAULT 0,
    `totalReviews` INTEGER NOT NULL DEFAULT 0,
    `averageRetention` DOUBLE NOT NULL DEFAULT 0,
    `studyTimeMinutes` INTEGER NOT NULL DEFAULT 0,
    `currentStreak` INTEGER NOT NULL DEFAULT 0,
    `longestStreak` INTEGER NOT NULL DEFAULT 0,
    `lastStudyDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `study_progress_userId_deckId_key`(`userId`, `deckId`),
    INDEX `study_progress_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reviews` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `cardId` VARCHAR(191) NOT NULL,
    `quality` INTEGER NOT NULL,
    `easeFactor` DOUBLE NOT NULL,
    `interval` INTEGER NOT NULL,
    `timeSpent` INTEGER NOT NULL DEFAULT 0,
    `reviewedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `nextReview` DATETIME(3) NOT NULL,

    INDEX `reviews_userId_reviewedAt_idx`(`userId`, `reviewedAt`),
    INDEX `reviews_cardId_idx`(`cardId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_stats` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `cardsStudied` INTEGER NOT NULL DEFAULT 0,
    `cardsLearned` INTEGER NOT NULL DEFAULT 0,
    `reviewsCompleted` INTEGER NOT NULL DEFAULT 0,
    `studyTimeMinutes` INTEGER NOT NULL DEFAULT 0,
    `newCardsLearned` INTEGER NOT NULL DEFAULT 0,
    `retentionRate` DOUBLE NOT NULL DEFAULT 0,

    UNIQUE INDEX `daily_stats_userId_date_key`(`userId`, `date`),
    INDEX `daily_stats_userId_date_idx`(`userId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `refreshToken` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `deviceType` VARCHAR(191) NULL,
    `isValid` BOOLEAN NOT NULL DEFAULT true,
    `expiresAt` DATETIME(3) NOT NULL,
    `lastActivity` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sessions_token_key`(`token`),
    INDEX `sessions_userId_idx`(`userId`),
    INDEX `sessions_token_idx`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `actionUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_userId_isRead_idx`(`userId`, `isRead`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `decks` ADD CONSTRAINT `decks_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flashcards` ADD CONSTRAINT `flashcards_deckId_fkey` FOREIGN KEY (`deckId`) REFERENCES `decks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `study_progress` ADD CONSTRAINT `study_progress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `study_progress` ADD CONSTRAINT `study_progress_deckId_fkey` FOREIGN KEY (`deckId`) REFERENCES `decks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_cardId_fkey` FOREIGN KEY (`cardId`) REFERENCES `flashcards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_stats` ADD CONSTRAINT `daily_stats_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;