package org.skidbladnir.contracts;

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

class ContractTests {

    @Test
    void testParallel() {
        Results results = Runner.path("classpath:org/skidbladnir/contracts")
                .tags("~@ignore")
                .parallel(5);
        generateReport(results.getReportDir());
        assertEquals(0, results.getFailCount(), results.getErrorMessages());
    }

    @Karate.Test
    Karate testTestCaseContract() {
        return Karate.run("test-case-contract").relativeTo(getClass());
    }

    @Karate.Test
    Karate testProviderContract() {
        return Karate.run("provider-contract").relativeTo(getClass());
    }

    @Karate.Test
    Karate testWorkflowContract() {
        return Karate.run("workflow-contract").relativeTo(getClass());
    }
    
    @Karate.Test
    Karate testApiContractValidation() {
        return Karate.run("api-contract-validation").relativeTo(getClass());
    }
    
    @Karate.Test
    Karate testCrossServiceSchema() {
        return Karate.run("cross-service-schema").relativeTo(getClass());
    }
    
    @Karate.Test
    Karate testApiVersionCompatibility() {
        return Karate.run("api-version-compatibility").relativeTo(getClass());
    }
    
    @Karate.Test
    Karate testSecurityHeaders() {
        return Karate.run("security-headers").relativeTo(getClass());
    }
    
    @Karate.Test
    Karate testPolyglotApiContract() {
        return Karate.run("polyglot-api-contract").relativeTo(getClass());
    }
    
    @Karate.Test
    Karate testCrossComponentWorkflow() {
        return Karate.run("cross-component-workflow").relativeTo(getClass());
    }
    
    @Karate.Test
    Karate testZephyrApiContract() {
        return Karate.run("zephyr-api-contract").relativeTo(getClass());
    }
    
    @Karate.Test
    Karate testQTestApiContract() {
        return Karate.run("qtest-api-contract").relativeTo(getClass());
    }
    
    @Karate.Test
    Karate testProviderErrorHandling() {
        return Karate.run("provider-error-handling").relativeTo(getClass());
    }
    
    /**
     * Run just the cross-component tests with the crossComponent tag.
     * These tests typically take longer to run as they go through the complete flow.
     */
    @Test
    void testCrossComponentOnly() {
        Results results = Runner.path("classpath:org/skidbladnir/contracts")
                .tags("@crossComponent")
                .parallel(1); // Run sequentially as they test workflow state
        generateReport(results.getReportDir());
        assertEquals(0, results.getFailCount(), results.getErrorMessages());
    }

    private void generateReport(String karateOutputPath) {
        Collection<File> jsonFiles = FileUtils.listFiles(new File(karateOutputPath), new String[] {"json"}, true);
        List<String> jsonPaths = new ArrayList<>(jsonFiles.size());
        jsonFiles.forEach(file -> jsonPaths.add(file.getAbsolutePath()));
        Configuration config = new Configuration(new File("target"), "skidbladnir-api-contracts");
        ReportBuilder reportBuilder = new ReportBuilder(jsonPaths, config);
        reportBuilder.generateReports();
    }
}