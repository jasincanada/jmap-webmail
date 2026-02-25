# JMAP Webmail - TODO List

**Mail Server:** Using [Stalw.art](https://stalw.art/) JMAP server
**Architecture docs:** See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## 📝 Remaining Tasks

### Authentication
- [x] OAuth2/OIDC with PKCE (SSO login, session persistence, RP-initiated logout)
- [x] "Remember me" session persistence for Basic Auth (encrypted httpOnly cookie)
- [ ] Test OAuth2 flow with Stalwart's built-in OAuth provider

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
- [x] Implement secure cookie handling (httpOnly cookies for OAuth refresh tokens and session persistence)

## 🐛 Known Issues
- [ ] Fix Next.js workspace root warning
