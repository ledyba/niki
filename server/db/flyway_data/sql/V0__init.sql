CREATE DATABASE IF NOT EXISTS `niki` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci /*!80016 DEFAULT ENCRYPTION='N' */;

USE `niki`;

CREATE TABLE `texts` (
  `id` int unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `text` LONGTEXT NOT NULL,
  `date` date NOT NULL,
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
