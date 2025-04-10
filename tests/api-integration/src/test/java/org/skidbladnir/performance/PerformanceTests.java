package org.skidbladnir.performance;

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

class PerformanceTests {

    @Test
    void testParallel() {
        Results results = Runner.path("classpath:org/skidbladnir/performance")
                .tags("~@ignore")
                .parallel(5);
        generateReport(results.getReportDir());
        assertEquals(0, results.getFailCount(), results.getErrorMessages());
    }

    @Karate.Test
    Karate testApiRateLimiting() {
        return Karate.run("api-rate-limiting").relativeTo(getClass());
    }

    @Karate.Test
    Karate testMigrationPerformance() {
        return Karate.run("migration-performance").relativeTo(getClass());
    }
    
    @Karate.Test
    Karate testApiPerformance() {
        return Karate.run("api-performance").relativeTo(getClass());
    }
    
    @Karate.Test
    Karate testLoadTest() {
        return Karate.run("load-test").relativeTo(getClass());
    }
    
    @Karate.Test
    Karate testStressTest() {
        return Karate.run("stress-test").relativeTo(getClass());
    }
    
    @Karate.Test
    Karate testSoakTest() {
        return Karate.run("soak-test").relativeTo(getClass());
    }
    
    @Karate.Test
    Karate testApiBridgePerformance() {
        return Karate.run("api-bridge-performance").relativeTo(getClass());
    }

    private void generateReport(String karateOutputPath) {
        Collection<File> jsonFiles = FileUtils.listFiles(new File(karateOutputPath), new String[] {"json"}, true);
        List<String> jsonPaths = new ArrayList<>(jsonFiles.size());
        jsonFiles.forEach(file -> jsonPaths.add(file.getAbsolutePath()));
        Configuration config = new Configuration(new File("target"), "skidbladnir-api-performance");
        ReportBuilder reportBuilder = new ReportBuilder(jsonPaths, config);
        reportBuilder.generateReports();
    }
}