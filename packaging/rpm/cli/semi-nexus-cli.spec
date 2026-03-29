Name:           semi-nexus-cli
Version:        %{version}
Release:        1%{?dist}
Summary:        SemiNexus CLI - Agent Capability Hub Command Line Tool

License:        MIT
URL:            https://github.com/tomyyy2/semi-nexus-cli
BuildArch:      noarch
Requires:       nodejs >= 18
Provides:       snx = %{version}-%{release}

%description
SemiNexus CLI is a pure command-line tool for managing AI Agent capabilities.
It supports offline users through Server-Client architecture.

Features:
- Capability search and subscription
- Local installation and management
- Multi-agent synchronization (Claude Code, OpenCode, OpenClaw)
- Offline mode support

%prep
%setup -q -n semi-nexus-cli-%{version}

%build
# Already built

%install
rm -rf %{buildroot}
mkdir -p %{buildroot}/usr/lib/semi-nexus-cli
mkdir -p %{buildroot}/usr/bin

cp -r dist %{buildroot}/usr/lib/semi-nexus-cli/
cp package.json %{buildroot}/usr/lib/semi-nexus-cli/

ln -sf /usr/lib/semi-nexus-cli/dist/index.js %{buildroot}/usr/bin/semi-nexus
ln -sf /usr/lib/semi-nexus-cli/dist/index.js %{buildroot}/usr/bin/snx

%files
%defattr(-,root,root,-)
/usr/bin/semi-nexus
/usr/bin/snx
/usr/lib/semi-nexus-cli

%post
echo ""
echo "=========================================="
echo "SemiNexus CLI installed successfully!"
echo "=========================================="
echo ""
echo "Run 'semi-nexus --help' to get started."
echo "Run 'semi-nexus init' to initialize configuration."
echo ""

%preun
# Nothing needed

%postun
if [ $1 -eq 0 ]; then
    echo "SemiNexus CLI uninstalled."
fi

%changelog
* Sat Mar 29 2025 SemiNexus Team <team@seminexus.com> - %{version}
- Initial package
