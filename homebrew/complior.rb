class Complior < Formula
  desc "AI Act Compliance Scanner & Fixer — terminal UI"
  homepage "https://complior.ai"
  version "1.0.0"
  license "Apache-2.0"

  on_macos do
    on_arm do
      url "https://github.com/a3ka/complior/releases/download/v#{version}/complior-macos-arm64"
      sha256 "PLACEHOLDER_SHA256_ARM64"
    end
    on_intel do
      url "https://github.com/a3ka/complior/releases/download/v#{version}/complior-macos-x86_64"
      sha256 "PLACEHOLDER_SHA256_X86_64"
    end
  end

  on_linux do
    on_arm do
      url "https://github.com/a3ka/complior/releases/download/v#{version}/complior-linux-aarch64"
      sha256 "PLACEHOLDER_SHA256_LINUX_AARCH64"
    end
    on_intel do
      url "https://github.com/a3ka/complior/releases/download/v#{version}/complior-linux-x86_64"
      sha256 "PLACEHOLDER_SHA256_LINUX_X86_64"
    end
  end

  def install
    binary_name = "complior"
    # The downloaded file is the binary itself
    downloaded = Dir["*"].first
    bin.install downloaded => binary_name
  end

  test do
    assert_match "Complior", shell_output("#{bin}/complior --version")
  end
end
