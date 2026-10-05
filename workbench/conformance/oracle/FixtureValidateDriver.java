// Dev-time oracle driver -- validates one conformance fixture's STANDARD-SIDE model (.kerml or
// .sysml) through the SysML v2 Pilot Implementation's own parser + validator, headless.
// Seed of DESIGN-sysml-differential-conformance-261005.md phase P1 (the oracle gate); hand-edit
// freely, nothing regenerates this file.
//
// DEPENDENCY, fetched not redistributed: the Pilot Implementation's kernel jar (EPL-2.0), release
// asset jupyter-sysml-kernel-<v>.zip from Systems-Modeling/SysML-v2-Pilot-Implementation, cached
// outside git and pinned by sha256 (P1's fetch script owns that; this file only needs the jar dir
// on the classpath). Verified against release 2026-08 / kernel 0.62.0 on Temurin 21.
//
//   javac -cp "<jar-dir>/*" FixtureValidateDriver.java
//   java  -cp "<jar-dir>/*:." FixtureValidateDriver <fixture.kerml|.sysml> <path to sysml.library>
//
// Three non-obvious steps, each load-bearing (learned 261005, KermlProbe3 probe):
//   1. SysMLPackage.eINSTANCE.eClass() BEFORE any setup -- the KerML grammar imports the SysML
//      metamodel, and without forced EPackage registration parsing dies on an unresolved
//      metamodel proxy, which reads as "KerML has no headless path" and is not.
//   2. Both standalone setups run; the KerML injector is the one kept. The shared
//      XtextResourceSet carries both grammars' registrations, so one driver handles .kerml AND
//      .sysml fixtures.
//   3. The ENTIRE sysml.library loads into the same resource set before the fixture. An
//      unloaded-library run is a WEAK oracle that reports errors it invented ("Must directly or
//      indirectly specialize Base::Anything" and friends are library-absence artifacts, not
//      fixture defects) -- a gate reporting something other than what it measured.
//
// Exit code: 0 clean, 1 any parse error or ERROR-severity validation issue. Severity comes from
// org.eclipse.xtext.diagnostics.Severity (note the split package; it is not validation.*).

import com.google.inject.Injector;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.stream.Stream;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.xtext.diagnostics.Severity;
import org.eclipse.xtext.resource.XtextResourceSet;
import org.eclipse.xtext.util.CancelIndicator;
import org.eclipse.xtext.validation.CheckMode;
import org.eclipse.xtext.validation.IResourceValidator;
import org.eclipse.xtext.validation.Issue;
import org.omg.kerml.xtext.KerMLStandaloneSetup;
import org.omg.sysml.lang.sysml.SysMLPackage;
import org.omg.sysml.xtext.SysMLStandaloneSetup;

public class FixtureValidateDriver {
  public static void main(String[] args) throws Exception {
    if (args.length != 2) {
      System.err.println("usage: FixtureValidateDriver <fixture.kerml|.sysml> <sysml.library dir>");
      System.exit(2);
    }
    SysMLPackage.eINSTANCE.eClass();
    new SysMLStandaloneSetup().createInjectorAndDoEMFRegistration();
    Injector inj = new KerMLStandaloneSetup().createInjectorAndDoEMFRegistration();
    XtextResourceSet rs = inj.getInstance(XtextResourceSet.class);
    long t0 = System.currentTimeMillis();
    int lib = 0;
    try (Stream<Path> s = Files.walk(Paths.get(args[1]))) {
      for (Path p : s.filter(p -> {
        String n = p.toString();
        return n.endsWith(".sysml") || n.endsWith(".kerml");
      }).toList()) {
        rs.getResource(URI.createFileURI(p.toAbsolutePath().toString()), true);
        lib++;
      }
    }
    System.out.println("library files loaded=" + lib + " in " + (System.currentTimeMillis() - t0) + "ms");
    Resource r = rs.getResource(URI.createFileURI(Paths.get(args[0]).toAbsolutePath().toString()), true);
    int parseErrors = r.getErrors().size();
    System.out.println("parseErrors=" + parseErrors + " roots=" + r.getContents().size());
    IResourceValidator v = inj.getInstance(IResourceValidator.class);
    int errs = 0;
    int warns = 0;
    for (Issue i : v.validate(r, CheckMode.ALL, CancelIndicator.NullImpl)) {
      if (i.getSeverity() == Severity.ERROR) {
        errs++;
        System.out.println("  ERROR: " + i.getMessage());
      } else {
        warns++;
        System.out.println("  " + i.getSeverity() + ": " + i.getMessage());
      }
    }
    System.out.println("VERDICT errors=" + errs + " warnings=" + warns
        + " totalMs=" + (System.currentTimeMillis() - t0));
    System.exit(parseErrors + errs > 0 ? 1 : 0);
  }
}
