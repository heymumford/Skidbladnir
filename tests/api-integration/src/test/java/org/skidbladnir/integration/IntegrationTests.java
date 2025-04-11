package org.skidbladnir.integration;

import com.intuit.karate.Results;
import com.intuit.karate.Runner;
import com.intuit.karate.junit5.Karate;
import net.masterthought.cucumber.Configuration;
import net.masterthought.cucumber.ReportBuilder;
import org.apache.commons.io.FileUtils;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class IntegrationTests {

    @Test
    void testParallel() {
        Results results = Runner.path("classpath:org/skidbladnir/integration")
                .tags("~@ignore")
                .parallel(5);
        generateReport(results.getReportDir());
        assertEquals(0, results.getFailCount(), results.getErrorMessages());
    }

    @Karate.Test
    Karate testApiToOrchestrator() {
        return Karate.run("api-to-orchestrator").relativeTo(getClass());
    }

    @Karate.Test
    Karate testOrchestratorToBinary() {
        return Karate.run("orchestrator-to-binary").relativeTo(getClass());
    }

    @Karate.Test
    Karate testE2EMigration() {
        return Karate.run("e2e-migration").relativeTo(getClass());
    }
    
    @Karate.Test
    Karate testVisureToTestrailMigration() {
        return Karate.run("visure-to-testrail-migration").relativeTo(getClass());
    }
    
    @Karate.Test
    Karate testErrorPropagation() {
        return Karate.run("error-propagation").relativeTo(getClass());
    }
    
    @Karate.Test
    Karate testCrossProviderAttachments() {
        return Karate.run("cross-provider-attachments").relativeTo(getClass());
    }

    private void generateReport(String karateOutputPath) {
        Collection<File> jsonFiles = FileUtils.listFiles(new File(karateOutputPath), new String[] {"json"}, true);
        List<String> jsonPaths = new ArrayList<>(jsonFiles.size());
        jsonFiles.forEach(file -> jsonPaths.add(file.getAbsolutePath()));
        Configuration config = new Configuration(new File("target"), "skidbladnir-api-integration");
        ReportBuilder reportBuilder = new ReportBuilder(jsonPaths, config);
        reportBuilder.generateReports();
    }
}