# JMAP Webmail - TODO List

**Mail Server:** Using [Stalw.art](https://stalw.art/) JMAP server
**Architecture docs:** See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## 📝 Remaining Tasks

### Advanced Features
- [ ] Add free/busy queries (Principal/getAvailability)
- [ ] Add calendar sharing UI (JMAP Sharing RFC 9670)
- [ ] Add email encryption support (PGP/GPG)

### Performance Optimizations
- [ ] Add email content caching
- [ ] Optimize bundle size
- [ ] Add service worker for offline support
- [ ] Implement lazy loading for attachments
- [ ] Add image optimization for email content

### Testing
- [ ] Add E2E tests with real JMAP server
- [ ] Add accessibility testing
- [ ] Performance testing

### Documentation
- [ ] Create user documentation
- [ ] Add API documentation for JMAP client
- [ ] Create deployment guide
- [ ] Add configuration documentation
- [ ] Create contributing guidelines

### Deployment
- [ ] Configure production build optimizations
- [ ] Set up monitoring and logging

### Security
- [ ] Implement rate limiting
- [ ] Add CORS configuration
- [ ] Implement secure cookie handling (note: uses Basic Auth, no session tokens)

## 🐛 Known Issues
- [ ] Fix Next.js workspace root warning
