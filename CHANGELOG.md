# Changelog

## [Unreleased]

### Added

- **Lune Dock Protocol v1 contract.** `LuneDockSnapshot`, `LuneDockProvider` and `LuneDockHost`
  describe the optional single-line dock integration: plugins own their presentation Components,
  the host owns placement, selection and width allocation.

- **Scoped discovery registry.** `getDockRegistry()` shares one registry across every installed copy
  of this package through `Symbol.for("nouvelle-lune.lune-protocol.v1")`, isolated by the stable Pi
  UI context, so separately packaged contributors see the same host.

- **Optional Pi lifecycle adapter.** `createDockContribution` keeps independent plugin UI usable when
  the host is absent or disabled, and owns host-presence handling, attachment order and detachment.

### Changed

- **Public npm package.** Publish as `@lune_99/lune-dock-protocol`, with its installation and host/contributor usage documented and public access configured.
