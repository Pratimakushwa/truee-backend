const router = require("express").Router();

const {
  getPublishedContent,
  getManagedContent,
  saveDraft,
  publishContent,
} = require("../controllers/pageContentController");

const {
  protect,
} = require("../middleware/authMiddleware");

const {
  superAdminOnly,
} = require("../middleware/roleMiddleware");

// Editor endpoints: only Super Admin.
router.get(
  "/manage/:pageKey",
  protect,
  superAdminOnly,
  getManagedContent
);

router.put(
  "/manage/:pageKey/draft",
  protect,
  superAdminOnly,
  saveDraft
);

router.put(
  "/manage/:pageKey/publish",
  protect,
  superAdminOnly,
  publishContent
);

// Website endpoint: only published values.
router.get("/:pageKey", getPublishedContent);

module.exports = router;