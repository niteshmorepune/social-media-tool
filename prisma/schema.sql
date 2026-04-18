-- ─────────────────────────────────────────────────────────────────────────────
-- Social Media Dost — Full Database Schema
-- Run this in Hostinger phpMyAdmin on database: u876979745_smtclaude
-- ─────────────────────────────────────────────────────────────────────────────

SET FOREIGN_KEY_CHECKS = 0;

-- ── User ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `User` (
  `id`        VARCHAR(36)                    NOT NULL DEFAULT (UUID()),
  `name`      VARCHAR(255)                   NOT NULL,
  `email`     VARCHAR(255)                   NOT NULL,
  `password`  VARCHAR(255)                   NOT NULL,
  `role`      ENUM('ADMIN','TEAM','CLIENT')  NOT NULL DEFAULT 'TEAM',
  `clientId`  VARCHAR(36)                             DEFAULT NULL,
  `createdAt` DATETIME(3)                    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3)                    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`),
  KEY `User_email_idx` (`email`),
  KEY `User_clientId_idx` (`clientId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Client ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `Client` (
  `id`             VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  `name`           VARCHAR(255)  NOT NULL,
  `industry`       VARCHAR(255)  NOT NULL,
  `brandTone`      LONGTEXT      NOT NULL,
  `targetAudience` LONGTEXT      NOT NULL,
  `logoUrl`        VARCHAR(255)           DEFAULT NULL,
  `website`        VARCHAR(255)           DEFAULT NULL,
  `primaryColor`   VARCHAR(20)            DEFAULT '#3B82F6',
  `assignedToId`   VARCHAR(36)            DEFAULT NULL,
  `createdAt`      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Client_name_idx` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Brief ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `Brief` (
  `id`                  VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  `clientId`            VARCHAR(36)   NOT NULL,
  `title`               VARCHAR(255)  NOT NULL,
  `contentGoal`         VARCHAR(255)  NOT NULL,
  `campaignDescription` LONGTEXT      NOT NULL,
  `specialInstructions` LONGTEXT               DEFAULT NULL,
  `scheduledMonth`      DATETIME(3)   NOT NULL,
  `createdById`         VARCHAR(36)   NOT NULL,
  `createdAt`           DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`           DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Brief_clientId_idx` (`clientId`),
  KEY `Brief_scheduledMonth_idx` (`scheduledMonth`),
  CONSTRAINT `Brief_clientId_fk`    FOREIGN KEY (`clientId`)    REFERENCES `Client` (`id`) ON DELETE CASCADE,
  CONSTRAINT `Brief_createdById_fk` FOREIGN KEY (`createdById`) REFERENCES `User`   (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── BriefPlatform ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `BriefPlatform` (
  `id`          VARCHAR(36)                          NOT NULL DEFAULT (UUID()),
  `briefId`     VARCHAR(36)                          NOT NULL,
  `platform`    VARCHAR(100)                         NOT NULL,
  `contentType` ENUM('IMAGE','VIDEO','CAROUSEL')     NOT NULL,
  PRIMARY KEY (`id`),
  KEY `BriefPlatform_briefId_idx` (`briefId`),
  CONSTRAINT `BriefPlatform_briefId_fk` FOREIGN KEY (`briefId`) REFERENCES `Brief` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Content ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `Content` (
  `id`              VARCHAR(36)                                                    NOT NULL DEFAULT (UUID()),
  `briefId`         VARCHAR(36)                                                    NOT NULL,
  `briefPlatformId` VARCHAR(36)                                                    NOT NULL,
  `platform`        VARCHAR(100)                                                   NOT NULL,
  `contentType`     ENUM('IMAGE','VIDEO','CAROUSEL')                               NOT NULL,
  `status`          ENUM('PENDING','APPROVED','REJECTED','REVISION_REQUESTED')     NOT NULL DEFAULT 'PENDING',
  `scheduledDate`   DATETIME(3)                                                             DEFAULT NULL,
  -- Common
  `caption`         LONGTEXT  DEFAULT NULL,
  `copy`            LONGTEXT  DEFAULT NULL,
  `hashtags`        LONGTEXT  DEFAULT NULL,
  `callToAction`    LONGTEXT  DEFAULT NULL,
  -- Image & Carousel
  `imagePrompt`     LONGTEXT  DEFAULT NULL,
  `slides`          JSON      DEFAULT NULL,
  -- Video
  `hook`            LONGTEXT  DEFAULT NULL,
  `script`          LONGTEXT  DEFAULT NULL,
  `onScreenText`    LONGTEXT  DEFAULT NULL,
  `videoConcept`    LONGTEXT  DEFAULT NULL,
  `duration`        VARCHAR(50)        DEFAULT NULL,
  `thumbnailPrompt` LONGTEXT  DEFAULT NULL,
  `createdAt`       DATETIME(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`       DATETIME(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Content_briefId_idx` (`briefId`),
  KEY `Content_status_idx` (`status`),
  KEY `Content_platform_idx` (`platform`),
  CONSTRAINT `Content_briefId_fk`         FOREIGN KEY (`briefId`)         REFERENCES `Brief`         (`id`) ON DELETE CASCADE,
  CONSTRAINT `Content_briefPlatformId_fk` FOREIGN KEY (`briefPlatformId`) REFERENCES `BriefPlatform` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Revision ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `Revision` (
  `id`            VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  `contentId`     VARCHAR(36)   NOT NULL,
  `requestedById` VARCHAR(36)   NOT NULL,
  `comment`       LONGTEXT      NOT NULL,
  `createdAt`     DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Revision_contentId_idx` (`contentId`),
  CONSTRAINT `Revision_contentId_fk`     FOREIGN KEY (`contentId`)     REFERENCES `Content` (`id`) ON DELETE CASCADE,
  CONSTRAINT `Revision_requestedById_fk` FOREIGN KEY (`requestedById`) REFERENCES `User`    (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Notification ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `Notification` (
  `id`        VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  `userId`    VARCHAR(36)   NOT NULL,
  `type`      VARCHAR(50)   NOT NULL,
  `title`     VARCHAR(255)  NOT NULL,
  `message`   LONGTEXT      NOT NULL,
  `link`      VARCHAR(500)           DEFAULT NULL,
  `read`      TINYINT(1)    NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Notification_userId_read_idx` (`userId`, `read`),
  CONSTRAINT `Notification_userId_fk` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Foreign key on User.clientId (after Client table exists) ─────────────────
ALTER TABLE `User`
  ADD CONSTRAINT `User_clientId_fk`
  FOREIGN KEY (`clientId`) REFERENCES `Client` (`id`) ON DELETE SET NULL;

SET FOREIGN_KEY_CHECKS = 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: First admin user
-- Email: admin@socialmediadost.com
-- Password: Admin@123  (change immediately after first login)
-- Password hash generated with bcrypt rounds=12
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO `User` (`id`, `name`, `email`, `password`, `role`, `createdAt`, `updatedAt`)
VALUES (
  UUID(),
  'Admin',
  'admin@socialmediadost.com',
  '$2a$12$N.taGQctg55DsC1fmkk85OtIEE00rXiZX.gtnFdUarCY8Kl24XFE6',
  'ADMIN',
  NOW(),
  NOW()
);
