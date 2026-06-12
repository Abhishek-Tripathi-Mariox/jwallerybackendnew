const LogoService = require("../services/LogoService");
const { uploadFileToAws } = require("../util/s3");

module.exports = () => {
  const getLogos = async (req, res, next) => {
    console.log("LogoController => getLogos");
    const logos = await LogoService().getAll();
    req.rData = logos;
    req.msg = "success";
    next();
  };

  const getPublicLogos = async (req, res, next) => {
    console.log("LogoController => getPublicLogos");
    const logos = await LogoService().getPublic();
    req.rData = logos;
    req.msg = "success";
    next();
  };

  const uploadLogo = async (req, res, next) => {
    console.log("LogoController => uploadLogo");
    const { type, title } = req.body;
    const adminId = req.admin.id;

    if (!type) {
      req.statusCode = 400;
      throw new Error("Logo type is required");
    }

    if (!req.files || !req.files.image) {
      req.statusCode = 400;
      throw new Error("Image file is required");
    }

    const file = req.files.image;
    const uploaded = await uploadFileToAws(file);

    const logo = await LogoService().upsert(
      type,
      uploaded.images,
      title || "",
      adminId,
    );

    req.rData = logo;
    req.msg = "logo_uploaded";
    next();
  };

  const deleteLogo = async (req, res, next) => {
    console.log("LogoController => deleteLogo");
    const { id } = req.params;

    await LogoService().remove(id);

    req.rData = null;
    req.msg = "logo_deleted";
    next();
  };

  return { getLogos, getPublicLogos, uploadLogo, deleteLogo };
};
