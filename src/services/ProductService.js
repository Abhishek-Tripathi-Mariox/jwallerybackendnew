const Products = require("../models/Product");
var ObjectId = require("mongoose").Types.ObjectId;

module.exports = () => {
  const addProducts = (data) => {
    return new Promise(function (resolve, reject) {
      let productsData = Products.create(data).then(resolve).catch(reject);
    });
  };

  const fetch = (id) => {
    return new Promise(function (resolve, reject) {
      let orm = Products.findById(id).select("-__v");
      orm.then(resolve).catch(reject);
    });
  };

  const fetchById = (id) => {
    return new Promise(function (resolve, reject) {
      let orm = Products.aggregate([
        {
          $match: { _id: new ObjectId(id) },
        },

        // CATEGORY LOOKUP (your schema supports only categoryId)
        {
          $lookup: {
            from: "categories",
            localField: "categoryId",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },

        // BRAND LOOKUP
        {
          $lookup: {
            from: "brands",
            let: { brandId: "$brandId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$brandId"] },
                  isDeleted: false,
                },
              },
              { $project: { brand: 1, image: 1 } },
            ],
            as: "brand",
          },
        },
        { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },

        // PRODUCT RATINGS
        {
          $lookup: {
            from: "productratings",
            let: { id: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$productId", "$$id"] },
                  isDeleted: false,
                },
              },
              {
                $project: {
                  review: 1,
                  rating: 1,
                  images: 1,
                  email: 1,
                  name: 1,
                },
              },
              { $limit: 10 },
            ],
            as: "rating",
          },
        },

        // GROUPING FINAL RESULT
        {
          $project: {
            productName: 1,
            productImages: 1,
            descriptionImages: 1,
            description: 1,
            features: 1,
            price: 1,
            discountPrice: 1,
            discountPercent: 1,
            rating: 1,
            totalRatings: 1,
            stock: 1,
            isActive: 1,
            isFeatured: 1,
            showOnDashboard: 1,
            brand: 1,
            category: 1,
            colors: 1,
            sizes: 1,
            highlights: 1,
            createdAt: 1,
            updatedAt: 1,
            ratingList: "$rating",
            ratingAvg: { $avg: "$rating.rating" },
          },
        },
      ]);

      orm.then(resolve).catch(reject);
    });
  };

  const fetchByIdForUser = (id, querys) => {
    return new Promise(function (resolve, reject) {
      let orm = Products.aggregate([
        {
          $match: {
            _id: new ObjectId(id),
          },
        },
        {
          $unwind: {
            path: "$categories",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "categories",
            let: { categoryId: "$categories.categoryId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$categoryId"] },
                },
              },
              {
                $project: {
                  categoryName: 1,
                  image: 1,
                },
              },
            ],
            as: "categories",
          },
        },
        {
          $unwind: {
            path: "$categories",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$subCategories",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "subcategories",
            let: { subCategoryId: "$subCategories.subCategoryId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$subCategoryId"] },
                },
              },
              {
                $project: {
                  subCategoryName: 1,
                  image: 1,
                },
              },
            ],
            as: "subCategories",
          },
        },
        {
          $unwind: {
            path: "$subCategories",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "carts",
            let: { productId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$productId", "$$productId"] },
                  ...querys,
                },
              },
              {
                $project: {
                  noOfUnits: 1,
                },
              },
            ],
            as: "cart",
          },
        },
        {
          $unwind: {
            path: "$cart",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "userwishlists",
            let: { productId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$productId", "$$productId"] },
                  ...querys,
                },
              },
              // {
              //   $project: {
              //     noOfUnits: 1,
              //   },
              // },
            ],
            as: "userwishlist",
          },
        },
        {
          $lookup: {
            from: "couponcodes",
            let: { productId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    // $in: ["$$productId", "$products.productId"],
                    $in: [
                      "$$productId",
                      { $ifNull: ["$products.productId", []] },
                    ],

                    // $in: ["$products.productId", "$$productId"],
                  },
                },
              },
              // {
              //   $project: {
              //     image: 1,
              //     name: 1,
              //     couponCode: 1,
              //     description: 1,
              //     discount: 1,
              //     offerType:1,
              //     offerTypes:1
              //   },
              // },
              { $skip: 0 },
              { $limit: 10 },
            ],
            as: "offers",
          },
        },
        {
          $lookup: {
            from: "productratings",
            let: { id: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$productId", "$$id"] },
                  isDeleted: false,
                },
              },
              {
                $lookup: {
                  from: "users",
                  let: { userId: "$userId" },
                  pipeline: [
                    {
                      $match: {
                        $expr: { $eq: ["$_id", "$$userId"] },
                      },
                    },
                    {
                      $project: {
                        profilePicture: 1,
                        email: 1,
                        mobileNumber: 1,
                        fullName: 1,
                      },
                    },
                  ],
                  as: "user",
                },
              },
              {
                $unwind: {
                  path: "$user",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $project: {
                  review: 1,
                  rating: 1,
                  images: 1,
                  email: 1,
                  name: 1,
                  createdAt: 1,
                  isAdmin: 1,
                  user: 1,
                },
              },
              { $skip: 0 },
              { $limit: 10 },
            ],
            as: "review",
          },
        },
        {
          $unwind: {
            path: "$review",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "brands",
            let: { brandId: "$brandId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$brandId"] },
                  isDeleted: false,
                },
              },
              {
                $project: {
                  brand: 1,
                  image: 1,
                },
              },
            ],
            as: "brand",
          },
        },
        {
          $unwind: {
            path: "$brand",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: "$_id",
            productName: { $first: "$productName" },
            productImage: { $first: "$productImage" },
            skuId: { $first: "$skuId" },
            descriptionImages: { $first: "$descriptionImages" },
            description: { $first: "$description" },
            features: { $first: "$features" },
            rank: { $first: "$rank" },
            units: { $first: "$units" },
            price: { $first: "$price" },
            brand: { $first: "$brand" },
            discount: { $first: "$discount" },
            isActive: { $first: "$isActive" },
            showOnDashboard: { $first: "$showOnDashboard" },
            afterDiscountPrice: { $first: "$afterDiscountPrice" },
            discountPrice: { $first: "$discountPrice" },
            createdAt: { $first: "$createdAt" },
            updatedAt: { $first: "$updatedAt" },
            reviews: { $addToSet: "$review" },
            offers: { $first: "$offers" },
            ratingAvg: {
              $avg: "$review.rating",
            },
            userwishlist: { $first: "$userwishlist" },
            cart: { $first: "$cart" },
            categories: { $addToSet: "$categories" },
            subCategories: { $addToSet: "$subCategories" },
          },
        },
        {
          $project: {
            productName: 1,
            description: 1,
            productImage: 1,
            afterDiscountPrice: 1,
            rank: 1,
            units: 1,
            price: 1,
            discount: 1,
            isActive: 1,
            features: 1,
            discountPrice: 1,
            categories: 1,
            subCategories: 1,
            reviews: 1,
            offers: 1,
            brand: 1,
            ratingAvg: {
              $ifNull: ["$ratingAvg", 0],
            },
            addedInWishList: {
              $cond: {
                if: { $gt: [{ $size: "$userwishlist" }, 0] },
                then: true,
                else: false,
              },
            },
            cart: {
              $ifNull: ["$cart.noOfUnits", 0],
            },
          },
        },
      ]);

      orm.then(resolve).catch(reject);
    });
  };

  const fetchByQuery = (query, querys) => {
    console.log("ProductsService => fetchByQuery");
    return new Promise(function (resolve, reject) {
      let orm = Products.findOne(query).select("-password").sort({ _id: -1 });
      orm.then(resolve).catch(reject);
    });
  };

  const getProductsWithUnit = (query, page, limit, sortBy, rating) => {
    if (page) {
      page -= 1;
    }

    let newSort = { rank: 1, _id: -1 };

    if (sortBy == 1) {
      newSort = { price: 1 };
    }
    if (sortBy == 2) {
      newSort = { price: -1 };
    }
    if (sortBy == 3) {
      newSort = { productName: 1, rank: 1 };
    }

    if (sortBy == 4) {
      newSort = { productName: -1, rank: 1 };
    }

    // let matching = {
    //   $match: {},
    // };

    // if (rating) {
    //   matching = {
    //     // $match: {
    //     //   ratingAvg: { $in: rating },
    //     // },
    //     $match: rating,
    //   };
    // }

    // console.log("mtching", matching);

    return new Promise(function (resolve, reject) {
      let orm = Products.aggregate([
        {
          $match: query,
        },
        {
          $unwind: {
            path: "$categories",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "categories",
            let: { categoryId: "$categories.categoryId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$categoryId"] },
                },
              },
              {
                $project: {
                  categoryName: 1,
                  image: 1,
                },
              },
            ],
            as: "categories",
          },
        },
        {
          $unwind: {
            path: "$categories",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$subCategories",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "subcategories",
            let: { subCategoryId: "$subCategories.subCategoryId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$subCategoryId"] },
                },
              },
              {
                $project: {
                  subCategoryName: 1,
                  image: 1,
                },
              },
            ],
            as: "subCategories",
          },
        },
        {
          $unwind: {
            path: "$subCategories",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "productratings",
            let: { id: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$productId", "$$id"] },
                  isDeleted: false,
                },
              },
              {
                $project: {
                  review: 1,
                  rating: 1,
                  images: 1,
                  email: 1,
                  name: 1,
                  createdAt: 1,
                  isAdmin: 1,
                },
              },
              { $skip: 0 },
              { $limit: 10 },
            ],
            as: "review",
          },
        },
        {
          $unwind: {
            path: "$review",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "brands",
            let: { brandId: "$brandId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$brandId"] },
                  isDeleted: false,
                },
              },
              {
                $project: {
                  brand: 1,
                  image: 1,
                },
              },
            ],
            as: "brand",
          },
        },
        {
          $unwind: {
            path: "$brand",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: "$_id",
            productName: { $first: "$productName" },
            productImage: { $first: "$productImage" },
            skuId: { $first: "$skuId" },
            descriptionImages: { $first: "$descriptionImages" },
            description: { $first: "$description" },
            features: { $first: "$features" },
            rank: { $first: "$rank" },
            units: { $first: "$units" },
            price: { $first: "$price" },
            brand: { $first: "$brand" },
            discount: { $first: "$discount" },
            showOnDashboard: { $first: "$showOnDashboard" },
            afterDiscountPrice: { $first: "$afterDiscountPrice" },
            discountPrice: { $first: "$discountPrice" },
            createdAt: { $first: "$createdAt" },
            updatedAt: { $first: "$updatedAt" },
            reviews: { $addToSet: "$review" },
            ratingAvg: {
              $avg: "$review.rating",
            },
            isActive: { $first: "$isActive" },
            categories: { $addToSet: "$categories" },
            subCategories: { $addToSet: "$subCategories" },
          },
        },
        // {
        //   $match: {
        //     ratingAvg: { $in: [1, 2, 4, 5] },
        //   },
        // },
        {
          $project: {
            productName: 1,
            description: 1,
            productImage: 1,
            afterDiscountPrice: 1,
            descriptionImages: 1,
            features: 1,
            skuId: 1,
            rank: 1,
            units: 1,
            price: 1,
            brand: 1,
            discount: 1,
            isActive: 1,
            features: 1,
            showOnDashboard: 1,
            discountPrice: 1,
            createdAt: 1,
            updatedAt: 1,
            categories: 1,
            subCategories: 1,
            reviews: 1,
            ratingAvg: {
              $ifNull: ["$ratingAvg", 0],
            },
          },
        },
        // matching,
        { $sort: newSort },
        // { $sort: { rank: 1 } },
        { $skip: page * limit },
        { $limit: limit },
      ]);

      orm.then(resolve).catch(reject);
    });
  };

  const getProductsWithUnitForUser = (
    query,
    page,
    limit,
    sortBy,
    rating,
    querys,
  ) => {
    if (page) {
      page -= 1;
    }

    let newSort = { rank: 1, _id: -1 };

    if (sortBy == 1) {
      newSort = { price: 1 };
    }
    if (sortBy == 2) {
      newSort = { price: -1 };
    }
    if (sortBy == 3) {
      newSort = { productName: 1, rank: 1 };
    }

    if (sortBy == 4) {
      newSort = { productName: -1, rank: 1 };
    }

    return new Promise(function (resolve, reject) {
      let orm = Products.aggregate([
        {
          $match: query,
        },
        {
          $unwind: {
            path: "$categories",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "categories",
            let: { categoryId: "$categories.categoryId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$categoryId"] },
                },
              },
              {
                $project: {
                  categoryName: 1,
                  image: 1,
                },
              },
            ],
            as: "categories",
          },
        },
        {
          $unwind: {
            path: "$categories",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$subCategories",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "subcategories",
            let: { subCategoryId: "$subCategories.subCategoryId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$subCategoryId"] },
                },
              },
              {
                $project: {
                  subCategoryName: 1,
                  image: 1,
                },
              },
            ],
            as: "subCategories",
          },
        },
        {
          $unwind: {
            path: "$subCategories",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "productratings",
            let: { id: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$productId", "$$id"] },
                  isDeleted: false,
                },
              },
              {
                $project: {
                  review: 1,
                  rating: 1,
                  images: 1,
                  email: 1,
                  name: 1,
                  createdAt: 1,
                  isAdmin: 1,
                },
              },
              { $skip: 0 },
              { $limit: 10 },
            ],
            as: "review",
          },
        },
        {
          $unwind: {
            path: "$review",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "brands",
            let: { brandId: "$brandId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$brandId"] },
                  isDeleted: false,
                },
              },
              {
                $project: {
                  brand: 1,
                  image: 1,
                },
              },
            ],
            as: "brand",
          },
        },
        {
          $unwind: {
            path: "$brand",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "carts",
            let: { productId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$productId", "$$productId"] },
                  ...querys,
                },
              },
              {
                $project: {
                  noOfUnits: 1,
                },
              },
            ],
            as: "cart",
          },
        },
        {
          $unwind: {
            path: "$cart",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "userwishlists",
            let: { productId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$productId", "$$productId"] },
                  ...querys,
                },
              },
              // {
              //   $project: {
              //     noOfUnits: 1,
              //   },
              // },
            ],
            as: "userwishlist",
          },
        },
        {
          $group: {
            _id: "$_id",
            productName: { $first: "$productName" },
            productImage: { $first: "$productImage" },
            skuId: { $first: "$skuId" },
            descriptionImages: { $first: "$descriptionImages" },
            description: { $first: "$description" },
            features: { $first: "$features" },
            rank: { $first: "$rank" },
            units: { $first: "$units" },
            price: { $first: "$price" },
            brand: { $first: "$brand" },
            discount: { $first: "$discount" },
            showOnDashboard: { $first: "$showOnDashboard" },
            afterDiscountPrice: { $first: "$afterDiscountPrice" },
            discountPrice: { $first: "$discountPrice" },
            createdAt: { $first: "$createdAt" },
            updatedAt: { $first: "$updatedAt" },
            reviews: { $addToSet: "$review" },
            ratingAvg: {
              $avg: "$review.rating",
            },
            cart: { $first: "$cart" },
            isActive: { $first: "$isActive" },
            categories: { $addToSet: "$categories" },
            userwishlist: { $first: "$userwishlist" },
            subCategories: { $addToSet: "$subCategories" },
          },
        },
        // {
        //   $match: {
        //     ratingAvg: { $in: [1, 2, 4, 5] },
        //   },
        // },
        {
          $project: {
            productName: 1,
            description: 1,
            productImage: 1,
            afterDiscountPrice: 1,
            descriptionImages: 1,
            features: 1,
            skuId: 1,
            rank: 1,
            units: 1,
            price: 1,
            brand: 1,
            discount: 1,
            isActive: 1,
            features: 1,
            showOnDashboard: 1,
            discountPrice: 1,
            createdAt: 1,
            updatedAt: 1,
            categories: 1,
            subCategories: 1,
            reviews: 1,
            ratingAvg: {
              $ifNull: ["$ratingAvg", 0],
            },
            addedInWishList: {
              $cond: {
                if: { $gt: [{ $size: "$userwishlist" }, 0] },
                then: true,
                else: false,
              },
            },
            cart: {
              $ifNull: ["$cart.noOfUnits", 0],
            },
          },
        },
        // matching,
        { $sort: newSort },
        // { $sort: { rank: 1 } },
        { $skip: page * limit },
        { $limit: limit },
      ]);

      orm.then(resolve).catch(reject);
    });
  };

  const getProductsForHomeScreen = (query, page, limit) => {
    if (page) {
      page -= 1;
    }

    return new Promise(function (resolve, reject) {
      let orm = Products.aggregate([
        {
          $match: query,
        },
        {
          $project: {
            productName: 1,
            productImage: 1,
          },
        },
        { $sort: { rank: 1 } },
        { $skip: page * limit },
        { $limit: limit },
      ]);

      orm.then(resolve).catch(reject);
    });
  };

  const newProducts = (query, page, limit, querys) => {
    if (page) {
      page -= 1;
    }

    return new Promise(function (resolve, reject) {
      let orm = Products.aggregate([
        {
          $match: query,
        },
        {
          $lookup: {
            from: "carts",
            let: { productId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$productId", "$$productId"] },
                  ...querys,
                },
              },
              {
                $project: {
                  noOfUnits: 1,
                },
              },
            ],
            as: "cart",
          },
        },
        {
          $unwind: {
            path: "$cart",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "userwishlists",
            let: { productId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$productId", "$$productId"] },
                  ...querys,
                },
              },
              {
                $project: {
                  _id: 1,
                },
              },
            ],
            as: "userwishlist",
          },
        },
        {
          $unwind: {
            path: "$categories",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "categories",
            let: { categoryId: "$categories.categoryId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$categoryId"] },
                },
              },
              {
                $project: {
                  categoryName: 1,
                  image: 1,
                },
              },
            ],
            as: "categories",
          },
        },
        {
          $unwind: {
            path: "$categories",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$subCategories",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "subcategories",
            let: { subCategoryId: "$subCategories.subCategoryId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$subCategoryId"] },
                },
              },
              {
                $project: {
                  subCategoryName: 1,
                  image: 1,
                },
              },
            ],
            as: "subCategories",
          },
        },
        {
          $unwind: {
            path: "$subCategories",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "productratings",
            let: { id: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$productId", "$$id"] },
                  isDeleted: false,
                },
              },
              {
                $project: {
                  review: 1,
                  rating: 1,
                  images: 1,
                  email: 1,
                  name: 1,
                  createdAt: 1,
                  isAdmin: 1,
                },
              },
              { $skip: 0 },
              { $limit: 10 },
            ],
            as: "review",
          },
        },
        {
          $unwind: {
            path: "$review",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "brands",
            let: { brandId: "$brandId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$brandId"] },
                  isDeleted: false,
                },
              },
              {
                $project: {
                  brand: 1,
                  image: 1,
                },
              },
            ],
            as: "brand",
          },
        },
        {
          $unwind: {
            path: "$brand",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: "$_id",
            productName: { $first: "$productName" },
            price: { $first: "$price" },
            afterDiscountPrice: { $first: "$afterDiscountPrice" },
            productImage: { $first: "$productImage" },
            userwishlist: { $first: "$userwishlist" },
            cart: { $first: "$cart" },
            brand: { $first: "$brand" },
            categories: { $addToSet: "$categories" },
            subCategories: { $addToSet: "$subCategories" },
            reviews: { $addToSet: "$review" },
            ratingAvg: {
              $avg: "$review.rating",
            },
          },
        },
        {
          $project: {
            productName: 1,
            afterDiscountPrice: 1,
            price: 1,
            productImage: 1,
            brand: 1,
            addedInWishList: {
              $cond: {
                if: { $gt: [{ $size: "$userwishlist" }, 0] },
                then: true,
                else: false,
              },
            },
            cart: {
              $ifNull: ["$cart.noOfUnits", 0],
            },
            categories: 1,
            subCategories: 1,
            reviews: 1,
            ratingAvg: {
              $ifNull: ["$ratingAvg", 0],
            },
          },
        },
        { $sort: { _id: -1 } },
        { $skip: 0 },
        { $limit: 10 },
      ]);

      orm.then(resolve).catch(reject);
    });
  };

  const topSold = (query, page, limit, querys) => {
    if (page) {
      page -= 1;
    } else {
      page = 0;
    }

    if (!limit) {
      limit = 10;
    }

    return new Promise(function (resolve, reject) {
      let orm = Products.aggregate([
        {
          $match: query,
        },
        {
          $lookup: {
            from: "userorders",
            let: { id: "$id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ["$$id", "$products.productId"],
                  },
                },
              },
              {
                $count: "totalSell",
              },
            ],
            as: "orders",
          },
        },
        {
          $unwind: {
            path: "$orders",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "userorders",
            let: { id: "$id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ["$$id", "$products.productId"],
                  },
                },
              },
            ],
            as: "userorders",
          },
        },
        {
          $unwind: {
            path: "$userorders",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "carts",
            let: { productId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$productId", "$$productId"] },
                  ...querys,
                },
              },
              {
                $project: {
                  noOfUnits: 1,
                },
              },
            ],
            as: "cart",
          },
        },
        {
          $unwind: {
            path: "$cart",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "userwishlists",
            let: { productId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$productId", "$$productId"] },
                  ...querys,
                },
              },
              // {
              //   $project: {
              //     noOfUnits: 1,
              //   },
              // },
            ],
            as: "userwishlist",
          },
        },
        {
          $unwind: {
            path: "$categories",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "categories",
            let: { categoryId: "$categories.categoryId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$categoryId"] },
                },
              },
              {
                $project: {
                  categoryName: 1,
                  image: 1,
                },
              },
            ],
            as: "categories",
          },
        },
        {
          $unwind: {
            path: "$categories",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$subCategories",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "subcategories",
            let: { subCategoryId: "$subCategories.subCategoryId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$subCategoryId"] },
                },
              },
              {
                $project: {
                  subCategoryName: 1,
                  image: 1,
                },
              },
            ],
            as: "subCategories",
          },
        },
        {
          $unwind: {
            path: "$subCategories",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "productratings",
            let: { id: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$productId", "$$id"] },
                  isDeleted: false,
                },
              },
              {
                $project: {
                  review: 1,
                  rating: 1,
                  images: 1,
                  email: 1,
                  name: 1,
                  createdAt: 1,
                  isAdmin: 1,
                },
              },
              { $skip: 0 },
              { $limit: 10 },
            ],
            as: "review",
          },
        },
        {
          $unwind: {
            path: "$review",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "brands",
            let: { brandId: "$brandId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$brandId"] },
                  isDeleted: false,
                },
              },
              {
                $project: {
                  brand: 1,
                  image: 1,
                },
              },
            ],
            as: "brand",
          },
        },
        {
          $unwind: {
            path: "$brand",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: "$_id",
            productName: { $first: "$productName" },
            brand: { $first: "$brand" },
            price: { $first: "$price" },
            afterDiscountPrice: { $first: "$afterDiscountPrice" },
            productImage: { $first: "$productImage" },
            orders: { $first: "$orders" },
            revenue: {
              $sum: "$userorders.grandTotal",
            },
            userwishlist: { $first: "$userwishlist" },
            cart: { $first: "$cart" },
            categories: { $addToSet: "$categories" },
            subCategories: { $addToSet: "$subCategories" },
            reviews: { $addToSet: "$review" },
            ratingAvg: {
              $avg: "$review.rating",
            },
          },
        },
        {
          $project: {
            productName: 1,
            afterDiscountPrice: 1,
            price: 1,
            productImage: 1,
            brand: 1,
            totalSell: {
              $ifNull: ["$orders.totalSell", 0],
            },
            revenue: {
              $ifNull: ["$revenue", 0],
            },
            addedInWishList: {
              $cond: {
                if: { $gt: [{ $size: "$userwishlist" }, 0] },
                then: true,
                else: false,
              },
            },
            cart: {
              $ifNull: ["$cart.noOfUnits", 0],
            },
            categories: 1,
            subCategories: 1,
            reviews: 1,
            ratingAvg: {
              $ifNull: ["$ratingAvg", 0],
            },
          },
        },
        { $sort: { totalSell: -1 } },
        { $skip: page * limit },
        { $limit: limit },
      ]);

      orm.then(resolve).catch(reject);
    });
  };

  const sellReport = (newQuery, query, page, limit) => {
    if (page) {
      page -= 1;
    } else {
      page = 0;
    }

    if (!limit) {
      limit = 10;
    }

    return new Promise(function (resolve, reject) {
      let orm = Products.aggregate([
        {
          $match: newQuery,
        },
        {
          $lookup: {
            from: "userorders",
            let: { id: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ["$$id", "$products.productId"],
                    // ...query,
                  },
                  ...query,
                },
              },
              {
                $count: "totalSell",
              },
            ],
            as: "orders",
          },
        },
        {
          $unwind: {
            path: "$orders",
            // preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "brands",
            let: { brandId: "$brandId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$brandId"] },
                  isDeleted: false,
                },
              },
              {
                $project: {
                  brand: 1,
                  image: 1,
                },
              },
            ],
            as: "brand",
          },
        },
        {
          $unwind: {
            path: "$brand",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            productName: 1,
            afterDiscountPrice: 1,
            productImage: 1,
            units: 1,
            price: 1,
            brand: 1,
            discountPrice: 1,
            totalSell: {
              $ifNull: ["$orders.totalSell", 0],
            },
          },
        },
        // {
        //   $match: {
        //     totalSell: { $gt: 0 },
        //   },
        // },
        { $sort: { totalSell: -1 } },
        { $skip: page * limit },
        { $limit: limit },
      ]);

      orm.then(resolve).catch(reject);
    });
  };

  const topSoldWithRevenew = (query) => {
    return new Promise(function (resolve, reject) {
      let orm = Products.aggregate([
        {
          $match: query,
        },
        {
          $lookup: {
            from: "userorders",
            let: { id: "$id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ["$$id", "$products.productId"],
                  },
                },
              },
              {
                $count: "totalSell",
              },
            ],
            as: "orders",
          },
        },
        {
          $unwind: {
            path: "$orders",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "brands",
            let: { brandId: "$brandId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$brandId"] },
                  isDeleted: false,
                },
              },
              {
                $project: {
                  brand: 1,
                  image: 1,
                },
              },
            ],
            as: "brand",
          },
        },
        {
          $unwind: {
            path: "$brand",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            productName: 1,
            afterDiscountPrice: 1,
            productImage: 1,
            brand: 1,
            totalSell: {
              $ifNull: ["$orders.totalSell", 0],
            },
          },
        },

        { $sort: { totalSell: -1 } },
        { $skip: 0 },
        { $limit: 10 },
      ]);

      orm.then(resolve).catch(reject);
    });
  };

  const updateProduct = (ProductsId, data) => {
    console.log("ProductsService => resetPassword");
    return new Promise(async function (resolve, reject) {
      let Product = await Products.findByIdAndUpdate({ _id: ProductsId }, data)
        .then(resolve)
        .catch(reject);
    });
  };

  const fetchByQueryToEdit = (query) => {
    console.log("ProductsService => fetchByQuery");
    return new Promise(function (resolve, reject) {
      let orm = Products.findOne(query).select("-password");

      orm.then(resolve).catch(reject);
    });
  };

  const getProducts = (query, page, limit, sortBy = { rank: 1, _id: -1 }) => {
    if (page) {
      page -= 1;
    }
    return new Promise(function (resolve, reject) {
      let orm = Products.find(query)
        .select("-password -__v")
        .sort(sortBy)
        .skip(page * limit)
        .limit(limit);
      orm.then(resolve).catch(reject);
    });
  };

  const countProducts = (query) => {
    return new Promise(function (resolve, reject) {
      let orm = Products.countDocuments(query);
      orm.then(resolve).catch(reject);
    });
  };

  const deleteProducts = (id) => {
    return new Promise(function (resolve, reject) {
      let orm = Products.deleteOne({ _id: id });
      orm.then(resolve).catch(reject);
    });
  };

  return {
    addProducts,
    fetch,
    fetchByQuery,
    updateProduct,
    fetchByQueryToEdit,
    getProducts,
    countProducts,
    deleteProducts,
    getProductsWithUnit,
    fetchById,
    fetchByIdForUser,
    getProductsForHomeScreen,
    newProducts,
    topSold,
    topSoldWithRevenew,
    sellReport,
    getProductsWithUnitForUser,
  };
};
