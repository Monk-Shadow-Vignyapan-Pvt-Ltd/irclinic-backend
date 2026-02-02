import express from "express";
import { addBanner, getBanners,getMobileBanners,getDesktopBanners,getMobileAboutBanners,
    getDesktopAboutBanners, getBannerById, deleteBanner, updateBanner,
     getBannerImage, getBannerMobileImage,getAboutBannerImage,getAboutBannerMobileImage} from "../controllers/banner.controller.js";

const router = express.Router();

router.route("/addBanner").post( addBanner);
router.route("/getBanners").get( getBanners);
router.route("/getMobileBanners").get( getMobileBanners);
router.route("/getDesktopBanners").get( getDesktopBanners);
router.route("/getMobileAboutBanners").get( getMobileAboutBanners);
router.route("/getDesktopAboutBanners").get( getDesktopAboutBanners);
router.route("/getBannerById/:id").put( getBannerById);
router.route("/updateBanner/:id").post( updateBanner);
router.route("/deleteBanner/:id").delete(deleteBanner);
router.route("/getBannerMobileImage/:id").get(getBannerMobileImage);
router.route("/getBannerImage/:id").get(getBannerImage);
router.route("/getAboutBannerImage/:id").get(getAboutBannerImage);
router.route("/getAboutBannerMobileImage/:id").get(getAboutBannerMobileImage);

export default router;