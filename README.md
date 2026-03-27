# 🎯 SWOT & AI Description Generator

AI-powered business analysis tool for sellers and buyers on business-for-sale platforms.

**Live Demo:** https://swot-generator.vercel.app *(replace with your URL)*

---

## 🌟 Features

- **SWOT Analysis Generator** - Comprehensive strengths, weaknesses, opportunities, and threats analysis
- **AI Description Writer** - Professional business listing descriptions in hybrid format
- **Data Enrichment** - Automatic integration with Google Places and SERP APIs
- **Social Media Scraping** - Automated follower count extraction
- **10 Sample Businesses** - Covering ideal cases, edge cases, and challenging scenarios
- **Privacy Mode** - Hide business names for confidential sales

---

## 🚀 Quick Start

### **For Testers:**
1. Visit the live URL
2. Click "Load Samples" → Select any business
3. Click "Generate SWOT" or "Generate Description"
4. Review outputs

### **For Developers:**

```bash
# 1. Clone repository
git clone https://github.com/YOUR_USERNAME/swot-generator.git
cd swot-generator

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env
# Add your API keys to .env

# 4. Start backend
npm start

# 5. Open frontend
# Open index.html in browser
```

---

## 🔑 Required API Keys

You need these API keys to run the full system:

1. **OpenAI API Key** - For SWOT and Description generation
   - Get it: https://platform.openai.com/api-keys
   
2. **Perplexity API Key** (Alternative to OpenAI)
   - Get it: https://www.perplexity.ai/settings/api
   
3. **Google Places API Key** - For business enrichment
   - Get it: https://console.cloud.google.com/google/maps-apis
   
4. **SERP API Key** - For competitor discovery and social scraping
   - Get it: https://serpapi.com/

---

## 📋 Sample Businesses Included

### **Ideal Cases (Work Perfectly):**
1. Digital Agency (Orfeostory)
2. Cafe (Tanjong Pagar)
3. Tuition Center
4. E-commerce Store

### **Challenging Cases (Test Edge Case Handling):**
5. Hardware Store (No Digital Presence)
6. Translation Service (Home-Based, Declining Revenue)
7. Import Trading (New Business <2 years)
8. Tax Preparation (Seasonal Business)
9. HR Consulting (Intentional Revenue Decline)
10. Precision Manufacturing (B2B Industrial)

---

## 🧪 Testing

See `TEST_CASE_GUIDE.md` for comprehensive testing instructions.

**Quick Test:**
1. Load "Digital Agency" sample
2. Click "Enrich Data"
3. Generate SWOT
4. Verify output quality

---

## 📁 Project Structure

```
swot-generator/
├── index.html              # Frontend UI (React)
├── api/
│   └── server.js          # Backend API (Express)
├── package.json           # Dependencies
├── vercel.json            # Vercel configuration
├── .env.example           # Example environment variables
├── VERCEL_DEPLOYMENT_GUIDE.md
├── TEST_CASE_GUIDE.md
└── README.md
```

---

## 🛠️ Tech Stack

**Frontend:**
- React 18
- TailwindCSS
- Marked.js (Markdown rendering)

**Backend:**
- Node.js
- Express
- Axios

**APIs:**
- OpenAI GPT-4
- Perplexity AI
- Google Places API
- SERP API

**Hosting:**
- Vercel (Frontend + Serverless Backend)

---

## 💰 Cost Estimates

**Per Business Analysis:**
- Enrichment: ~$0.081 (Google Places + SERP)
- SWOT Generation: ~$0.05-0.10 (OpenAI) or ~$0.01-0.03 (Perplexity)
- Description: ~$0.02-0.05 (OpenAI) or ~$0.01-0.02 (Perplexity)

**Total per analysis:** $0.15-0.24 (OpenAI) or $0.11-0.16 (Perplexity)

---

## 🚀 Deployment

See `VERCEL_DEPLOYMENT_GUIDE.md` for complete deployment instructions.

**Quick Deploy:**
```bash
# 1. Push to GitHub
git push

# 2. Import to Vercel
# Visit vercel.com → Import Project

# 3. Add environment variables in Vercel dashboard

# 4. Deploy!
```

---

## 📝 License

MIT License - Feel free to use for commercial or personal projects

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📞 Support

- **Issues:** Use GitHub Issues
- **Documentation:** See `VERCEL_DEPLOYMENT_GUIDE.md` and `TEST_CASE_GUIDE.md`
- **Testing:** See `TEST_CASE_GUIDE.md`

---

## 🎯 Roadmap

### **Phase 1 (Current):**
- ✅ SWOT Generation
- ✅ Description Writer
- ✅ Data Enrichment
- ✅ Edge Case Handling
- ✅ 10 Sample Businesses

### **Phase 2 (Planned):**
- [ ] User authentication
- [ ] Save/load business profiles
- [ ] Export to PDF
- [ ] Advanced financials schema
- [ ] Industry-specific templates

### **Phase 3 (Future):**
- [ ] Valuation calculator
- [ ] Competitive analysis reports
- [ ] AI-powered data verification
- [ ] Video walkthrough generator

---

**Built with ❤️ for business sellers and buyers**
