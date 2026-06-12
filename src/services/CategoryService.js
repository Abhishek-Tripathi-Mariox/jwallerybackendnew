const Category = require("../models/Catagory");
var ObjectId = require("mongoose").Types.ObjectId;

module.exports = () => {
  const addCategory = (data) => {
    return new Promise(function (resolve, reject) {
      Category.create(data).then(resolve).catch(reject);
    });
  };

  const fetch = (id) => {
    return new Promise(function (resolve, reject) {
      let orm = Category.findById(id).select("-password  -__v");
      orm.then(resolve).catch(reject);
    });
  };

  const fetchById = (id) => {
    return new Promise(function (resolve, reject) {
      let orm = Category.aggregate([
        {
          $match: {
            _id: new ObjectId(id),
          },
        },
        {
          $lookup: {
            from: "subcategories",
            let: { id: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$categoryId", "$$id"] },
                  isDeleted: false,
                },
              },
              {
                $project: {
                  subCategoryName: 1,
                  image: 1,
                },
              },
            ],
            as: "subCategory",
          },
        },
        {
          $project: {
            categoryName: 1,
            image: 1,
            subCategory: 1,
            rank: 1,
            description: 1,
          },
        },
      ]);

      orm.then(resolve).catch(reject);
    });
  };

  const fetchByQuery = (query) => {
    console.log("CategoryService => fetchByQuery");
    return new Promise(function (resolve, reject) {
      let orm = Category.findOne(query).select("-password").sort({ _id: -1 });
      orm.then(resolve).catch(reject);
    });
  };

  const updateCategory = (CategoryId, data) => {
    console.log("CategoryService => resetPassword");
    return new Promise(async function (resolve, reject) {
      await Category.findByIdAndUpdate({ _id: CategoryId }, data)
        .then(resolve)
        .catch(reject);
    });
  };

  const fetchByQueryToEdit = (query) => {
    console.log("CategoryService => fetchByQuery");
    return new Promise(function (resolve, reject) {
      let orm = Category.findOne(query).select("-password");

      orm.then(resolve).catch(reject);
    });
  };

  const getCategory = (query, page, limit) => {
    if (page) {
      page -= 1;
    }
    return new Promise(function (resolve, reject) {
      let orm = Category.find(query)
        .select("-isDeleted  -__v")
        .sort({ rank: 1 })
        .skip(page * limit)
        .limit(limit);
      orm.then(resolve).catch(reject);
    });
  };

  const getCategoryWithSubCategories = (query, page, limit) => {
    if (page) {
      page -= 1;
    }

    return new Promise(function (resolve, reject) {
      let orm = Category.aggregate([
        {
          $match: query,
        },
        {
          $lookup: {
            from: "subcategories",
            let: { id: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$categoryId", "$$id"] },
                  isDeleted: false,
                },
              },
              {
                $count: "totalSubCategories",
              },
            ],
            as: "subCategory",
          },
        },
        {
          $unwind: {
            path: "$subCategory",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            categoryName: 1,
            image: 1,
            rank: 1,
            description: 1,
            totalSubCategories: {
              $ifNull: ["$subCategory.totalSubCategories", ""],
            },
          },
        },
        { $sort: { rank: 1 } },
        { $skip: page * limit },
        { $limit: limit },
      ]);

      orm.then(resolve).catch(reject);
    });
  };

  const getCategoryHomeScreen = (query, page, limit, querys) => {
    if (page) {
      page -= 1;
    }

    return new Promise(function (resolve, reject) {
      let orm = Category.aggregate([
        {
          $match: query,
        },
        {
          $lookup: {
            from: "products",
            let: { id: "$_id" },
            pipeline: [
              {
                $match: {
                  // $expr: { $eq: ["$categoryId", "$$id"] },
                  // $expr: { $eq: ["$categories.categoryId", "$$id"] },
                  $expr: {
                    $in: ["$$id", "$categories.categoryId"],
                  },
                  isDeleted: false,
                  showOnDashboard: true,
                  isActive: true,
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
                  afterDiscountPrice: { $first: "$afterDiscountPrice" },
                  productImage: { $first: "$productImage" },
                  brand: { $first: "$brand" },
                  orders: { $first: "$orders" },
                  userwishlist: { $first: "$userwishlist" },
                  cart: { $first: "$cart" },
                  subCategories: { $addToSet: "$subCategories" },
                  reviews: { $addToSet: "$review" },
                  price: { $first: "$price" },
                  ratingAvg: {
                    $avg: "$review.rating",
                  },
                },
              },
              {
                $project: {
                  productName: 1,
                  productImage: 1,
                  afterDiscountPrice: 1,
                  subCategories: 1,
                  brand: 1,
                  price: 1,
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
                  reviews: 1,
                  ratingAvg: {
                    $ifNull: ["$ratingAvg", 0],
                  },
                },
              },
              { $skip: 0 },
              { $limit: 10 },
            ],
            as: "products",
          },
        },
        { $project: { categoryName: 1, image: 1, products: 1, rank: 1 } },
        { $skip: page * limit },
        { $limit: limit },
        { $sort: { rank: 1 } },
      ]);

      orm.then(resolve).catch(reject);
    });
  };

  const getCategoryWithSubCategory = (query, page, limit, querys) => {
    if (page) {
      page -= 1;
    }

    return new Promise(function (resolve, reject) {
      let orm = Category.aggregate([
        {
          $match: query,
        },
        {
          $lookup: {
            from: "subcategories",
            let: { id: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$categoryId", "$$id"] },
                  isDeleted: false,
                },
              },
              {
                $project: {
                  subCategoryName: 1,
                  image: 1,
                },
              },
            ],
            as: "subCategory",
          },
        },
        {
          $project: {
            categoryName: 1,
            image: 1,
            subCategory: 1,
            rank: 1,
            isActive: 1,
          },
        },
        { $skip: page * limit },
        { $limit: limit },
        { $sort: { rank: 1 } },
      ]);

      orm.then(resolve).catch(reject);
    });
  };

  const getCategoryWithProducts = (query, page, limit, querys) => {
    if (page) {
      page -= 1;
    }

    return new Promise(function (resolve, reject) {
      let orm = Category.aggregate([
        {
          $match: query,
        },
        {
          $lookup: {
            from: "products",
            let: { id: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$categoryId", "$$id"] },
                },
              },
              {
                $lookup: {
                  from: "productunits",
                  let: { productId: "$_id" },
                  pipeline: [
                    {
                      $match: {
                        $expr: { $eq: ["$productId", "$$productId"] },
                      },
                    },
                    {
                      $lookup: {
                        from: "carts",
                        let: { productUnitId: "$_id" },
                        pipeline: [
                          {
                            $match: {
                              $expr: { $eq: ["$unitId", "$$productUnitId"] },
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
                      $project: {
                        price: 1,
                        quantity: 1,
                        discountType: 1,
                        discountPrice: 1,
                        discount: 1,
                        unit: 1,
                        isActive: 1,
                        discountTypes: 1,
                        afterDiscountPrice: 1,
                        cart: 1,
                      },
                    },
                  ],
                  as: "units",
                },
              },
              {
                $project: {
                  productName: 1,
                  description: 1,
                  skuid: 1,
                  productImage: 1,
                  units: 1,
                },
              },
              { $skip: 0 },
              { $limit: 10 },
            ],
            as: "products",
          },
        },
        { $project: { categoryName: 1, products: 1, rank: 1 } },
        { $skip: page * limit },
        { $limit: limit },
        { $sort: { rank: 1 } },
      ]);

      orm.then(resolve).catch(reject);
    });
  };

  const getCategoriesWithProductCount = (query, page, limit) => {
    if (page) {
      page -= 1;
    }

    return new Promise(function (resolve, reject) {
      let orm = Category.aggregate([
        {
          $match: query,
        },
        {
          $lookup: {
            from: "products",
            let: { id: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ["$$id", "$categories.categoryId"],
                  },
                  isDeleted: false,
                  isActive: true,
                },
              },
              {
                $lookup: {
                  from: "userorders",
                  let: { productId: "$_id" },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $in: ["$$productId", "$products.productId"],
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
                $project: {
                  // productName: 1,
                  // afterDiscountPrice: 1,
                  // productImage: 1,
                  units: 1,
                  totalSell: {
                    $ifNull: ["$orders.totalSell", 0],
                  },
                },
              },
              { $skip: 0 },
              { $limit: 10 },
            ],
            as: "products",
          },
        },
        {
          $group: {
            _id: "$_id",
            categoryName: { $first: "$categoryName" },
            rank: { $first: "$rank" },
            // products: { $first: "$products" },
            units: {
              $sum: { $sum: "$products.units" },
            },
            totalSold: {
              $sum: { $sum: "$products.totalSell" },
            },
          },
        },
        // {
        //   $project: {
        //     _id: 1,
        //     categoryName: 1,
        //     rank: 1,
        //     unit: 1,
        //     totalSell: 1,
        //   },
        // },
        { $skip: page * limit },
        { $limit: limit },
        { $sort: { rank: 1 } },
      ]);

      orm.then(resolve).catch(reject);
    });
  };

  const countCategory = (query) => {
    return new Promise(function (resolve, reject) {
      let orm = Category.countDocuments(query);
      orm.then(resolve).catch(reject);
    });
  };

  const deleteCategory = (id) => {
    return new Promise(function (resolve, reject) {
      let orm = Category.deleteOne({ _id: id });
      orm.then(resolve).catch(reject);
    });
  };

  return {
    addCategory,
    fetch,
    fetchByQuery,
    updateCategory,
    fetchByQueryToEdit,
    getCategory,
    countCategory,
    deleteCategory,
    getCategoryWithProducts,
    fetchById,
    getCategoryWithSubCategory,
    getCategoryHomeScreen,
    getCategoryWithSubCategories,
    getCategoriesWithProductCount,
  };
};
