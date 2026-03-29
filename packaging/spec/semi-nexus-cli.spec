Name: semi-nexus-cli
Version: 0.1.0
Release: 1
Summary: SemiNexus CLI - Agent Capability Hub CLI
License: MIT
URL: https://github.com/tomyyy2/semi-nexus-cli
BuildArch: x86_64
Requires: nodejs >= 18

%description
SemiNexus CLI is a pure command-line tool for managing AI Agent capabilities.
It supports offline users through Server-Client architecture.

%prep
# No prep needed for binary packages

%build
# Already built via npm run build

%install
rm -rf %{buildroot}
mkdir -p %{buildroot}/usr/local/bin
mkdir -p %{buildroot}/usr/local/lib/semi-nexus-cli

cp -r ./dist %{buildroot}/usr/local/lib/semi-nexus-cli/
cp -r ./package*.json %{buildroot}/usr/local/lib/semi-nexus-cli/

ln -s /usr/local/lib/semi-nexus-cli/dist/index.js %{buildroot}/usr/local/bin/semi-nexus
ln -s /usr/local/lib/semi-nexus-cli/dist/index.js %{buildroot}/usr/local/bin/snx

%files
/usr/local/lib/semi-nexus-cli/*
/usr/local/bin/semi-nexus
/usr/local/bin/snx

%post
echo "SemiNexus CLI installed successfully!"
echo "Run 'semi-nexus --help' to get started."

%preun
# Nothing needed for uninstall

%postun
rm -f /usr/local/bin/semi-nexus
rm -f /usr/local/bin/snx
rm -rf /usr/local/lib/semi-nexus-cli
