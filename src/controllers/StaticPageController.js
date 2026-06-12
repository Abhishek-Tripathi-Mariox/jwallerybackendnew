const StaticPageService = require("../services/StaticPageService");

module.exports = () => {
  // ============ PUBLIC ============
  const getPublic = async (req, res, next) => {
    console.log("StaticPageController => getPublic");
    const page = await StaticPageService().getBySlug(req.params.slug);
    if (!page) {
      req.rCode = 5;
      req.msg = "page_not_found";
      return next();
    }
    req.rData = page;
    req.msg = "success";
    next();
  };

  const listPublic = async (req, res, next) => {
    console.log("StaticPageController => listPublic");
    const pages = await StaticPageService().list();
    // Only surface fields useful for menus.
    req.rData = pages.map((p) => ({
      slug: p.slug,
      title: p.title,
      subtitle: p.subtitle,
    }));
    req.msg = "success";
    next();
  };

  // ============ ADMIN ============
  const adminList = async (req, res, next) => {
    console.log("StaticPageController => adminList");
    req.rData = await StaticPageService().list({ includeDrafts: true });
    req.msg = "success";
    next();
  };

  const adminGet = async (req, res, next) => {
    console.log("StaticPageController => adminGet");
    const page = await StaticPageService().getBySlug(req.params.slug, {
      includeDrafts: true,
    });
    req.rData = page;
    req.msg = "success";
    next();
  };

  const adminUpsert = async (req, res, next) => {
    console.log("StaticPageController => adminUpsert");
    const { slug, title, subtitle, content, isPublished, seoDescription } =
      req.body;
    if (!slug || !title) {
      req.statusCode = 400;
      throw new Error("slug and title are required");
    }
    const page = await StaticPageService().upsert(
      slug,
      {
        title,
        subtitle: subtitle || "",
        content: content || "",
        isPublished: isPublished !== false,
        seoDescription: seoDescription || "",
      },
      req.admin?.id,
    );
    req.rData = page;
    req.msg = "success";
    next();
  };

  const adminDelete = async (req, res, next) => {
    console.log("StaticPageController => adminDelete");
    await StaticPageService().remove(req.params.id);
    req.rData = null;
    req.msg = "success";
    next();
  };

  return {
    getPublic,
    listPublic,
    adminList,
    adminGet,
    adminUpsert,
    adminDelete,
  };
};
