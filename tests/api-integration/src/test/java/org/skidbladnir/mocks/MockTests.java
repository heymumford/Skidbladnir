package org.skidbladnir.mocks;

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

class MockTests {

    @Test
    void testParallel() {
        Results results = Runner.path("classpath:org/skidbladnir/mocks")
                .tags("~@ignore")
                .parallel(5);
        generateReport(results.getReportDir());
        assertEquals(0, results.getFailCount(), results.getErrorMessages());
    }

    @Karate.Test
    Karate testProviderMocks() {
        return Karate.run("provider-mocks").relativeTo(getClass());
    }
    
    @Karate.Test
    Karate testZephyrMock() {
        return Karate.run("zephyr-api-mock").relativeTo(getClass());
    }
    
    @Karate.Test
    Karate testQTestMock() {
        return Karate.run("qtest-mock").relativeTo(getClass());
    }

    private void generateReport(String karateOutputPath) {
        Collection<File> jsonFiles = FileUtils.listFiles(new File(karateOutputPath), new String[] {"json"}, true);
        List<String> jsonPaths = new ArrayList<>(jsonFiles.size());
        jsonFiles.forEach(file -> jsonPaths.add(file.getAbsolutePath()));
        Configuration config = new Configuration(new File("target"), "skidbladnir-api-mocks");
        ReportBuilder reportBuilder = new ReportBuilder(jsonPaths, config);
        reportBuilder.generateReports();
    }
}