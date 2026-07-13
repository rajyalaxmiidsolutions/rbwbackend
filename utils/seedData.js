const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Category = require('../models/Category');
const Product = require('../models/Product');

const seedData = async () => {
  try {
    let conn;
    try {
      console.log('Connecting to Atlas database...');
      conn = await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
      console.log(`Connected to Atlas: ${conn.connection.host}`);
    } catch (err) {
      console.error('Atlas database connection failed. Falling back to local MongoDB...');
      conn = await mongoose.connect('mongodb://127.0.0.1:27017/rbw');
      console.log(`Connected to Local DB: ${conn.connection.host}`);
    }

    // Clear existing products and categories
    await Product.deleteMany({});
    await Category.deleteMany({});
    console.log('Cleared existing products and categories.');

    // Seed Categories
    const categoriesData = [
      {
        name: 'Velvet Burgundy Collection',
        description: 'Exquisite burgundy cards crafted with luxurious velvet fabric and gold foil accents.',
        image: {
          url: 'https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?q=80&w=600&auto=format&fit=crop',
          publicId: 'seed/cat_velvet'
        }
      },
      {
        name: 'Royal Scroll Invitations',
        description: 'Traditional Indian wedding scroll cards on rich satin, silk, and handmade paper.',
        image: {
          url: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?q=80&w=600&auto=format&fit=crop',
          publicId: 'seed/cat_scroll'
        }
      },
      {
        name: 'Modern Minimalist',
        description: 'Clean layouts with elegant modern typography, fine cardstock, and sleek details.',
        image: {
          url: 'https://images.unsplash.com/photo-1546032994-dd20b38fc9da?q=80&w=600&auto=format&fit=crop',
          publicId: 'seed/cat_minimalist'
        }
      },
      {
        name: 'Intricate Laser Cut',
        description: 'Exquisitely laser-cut cards featuring traditional patterns and modern geometry.',
        image: {
          url: 'https://images.unsplash.com/photo-1509924896524-3ac872528fbb?q=80&w=600&auto=format&fit=crop',
          publicId: 'seed/cat_lasercut'
        }
      }
    ];

    const seededCategories = await Category.create(categoriesData);
    console.log('Categories seeded:', seededCategories.length);

    // Map categories for product association
    const velvetCat = seededCategories.find(c => c.name === 'Velvet Burgundy Collection');
    const scrollCat = seededCategories.find(c => c.name === 'Royal Scroll Invitations');
    const minimalCat = seededCategories.find(c => c.name === 'Modern Minimalist');
    const laserCat = seededCategories.find(c => c.name === 'Intricate Laser Cut');

    // Seed Products
    const productsData = [
      // Velvet Burgundy
      {
        name: 'Imperial Burgundy Velvet Card',
        description: 'A luxurious burgundy velvet wedding card featuring high-quality gold foil stamping, elegant floral laser cut border, and a matching gold inserts set. Designed for premium weddings.',
        category: velvetCat._id,
        price: 180,
        moq: 100,
        images: [
          {
            url: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?q=80&w=800&auto=format&fit=crop',
            publicId: 'seed/prod_velvet1'
          }
        ],
        stock: 5000,
        status: 'active'
      },
      {
        name: 'Royal Burgundy Velvet Folder',
        description: 'Premium trifold burgundy velvet card with an embossed gold monogram seal and exquisite satin ribbon closure. Includes three matching burgundy cardstock inserts.',
        category: velvetCat._id,
        price: 220,
        moq: 150,
        images: [
          {
            url: 'https://images.unsplash.com/photo-1546032994-dd20b38fc9da?q=80&w=800&auto=format&fit=crop',
            publicId: 'seed/prod_velvet2'
          }
        ],
        stock: 4500,
        status: 'active'
      },

      // Royal Scroll
      {
        name: 'Crimson Satin Royal Scroll',
        description: 'Stunning crimson red satin scroll wedding invitation with gold-plated plastic rollers, metallic gold thread tassel, and a matching cardboard box with gold foil printing.',
        category: scrollCat._id,
        price: 120,
        moq: 200,
        images: [
          {
            url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=800&auto=format&fit=crop',
            publicId: 'seed/prod_scroll1'
          }
        ],
        stock: 8000,
        status: 'active'
      },
      {
        name: 'Gold Silk Scroll in Velvet Box',
        description: 'Elite gold silk fabric scroll housed in a beautiful matching burgundy velvet box with gold foil lettering. Designed for the ultimate luxury wedding experience.',
        category: scrollCat._id,
        price: 350,
        moq: 50,
        images: [
          {
            url: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?q=80&w=800&auto=format&fit=crop',
            publicId: 'seed/prod_scroll2'
          }
        ],
        stock: 3000,
        status: 'active'
      },

      // Modern Minimalist
      {
        name: 'Classic White & Burgundy Minimalist Card',
        description: 'Ultra-modern invitation featuring minimalist layouts, sans-serif typography, printed on premium 400gsm linen cardstock. Subtle burgundy borders add a hint of timeless luxury.',
        category: minimalCat._id,
        price: 90,
        moq: 250,
        images: [
          {
            url: 'https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?q=80&w=800&auto=format&fit=crop',
            publicId: 'seed/prod_minimal1'
          }
        ],
        stock: 12000,
        status: 'active'
      },
      {
        name: 'Sleek Serif Invitation Set',
        description: 'A minimalist white card with embossed letterpress typography and a rich burgundy envelope. The epitome of modern Zara-inspired luxury design.',
        category: minimalCat._id,
        price: 110,
        moq: 200,
        images: [
          {
            url: 'https://images.unsplash.com/photo-1509924896524-3ac872528fbb?q=80&w=800&auto=format&fit=crop',
            publicId: 'seed/prod_minimal2'
          }
        ],
        stock: 9000,
        status: 'active'
      },

      // Laser Cut
      {
        name: 'Burgundy Flora Laser Cut Card',
        description: 'Stunning intricate floral lace design cut with precision lasers on rich burgundy cardstock. Encased in a translucent vellum wrap and sealed with a wax seal.',
        category: laserCat._id,
        price: 140,
        moq: 150,
        images: [
          {
            url: 'https://images.unsplash.com/photo-1510074377623-8cf13fb86c08?q=80&w=800&auto=format&fit=crop',
            publicId: 'seed/prod_laser1'
          }
        ],
        stock: 6500,
        status: 'active'
      },
      {
        name: 'Gilded Gatefold Laser Cut Card',
        description: 'Luxury laser cut gatefold card opening to reveal a gold foiled invitation board. Made from heavy 350gsm premium matte burgundy paper.',
        category: laserCat._id,
        price: 160,
        moq: 150,
        images: [
          {
            url: 'https://images.unsplash.com/photo-1520854221256-17451cc35953?q=80&w=800&auto=format&fit=crop',
            publicId: 'seed/prod_laser2'
          }
        ],
        stock: 7000,
        status: 'active'
      }
    ];

    const seededProducts = await Product.create(productsData);
    console.log('Products seeded:', seededProducts.length);

    console.log('Seeding completed successfully!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
};

seedData();
