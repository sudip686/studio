# app.R
# Version 17.2: "Citation & Documentation Update"
# Author: Ghozian Islam Karami
#
# Changelog v17.2:
# - ENHANCEMENT (About Tab): Updated the "About" tab to include detailed
#   License and Citation information (Plain Text and BibTeX formats) as provided.
#
# Changelog v17.1:
# - BUG FIX (Lithology Colors): Fixed a CSS typo that prevented color swatch rendering.
#
# Changelog v17.0:
# - SIMPLIFICATION: Removed all survey data functionality.
# - ENHANCEMENT (Validation): Added Assay-missing-Collar validation check.


# --- 1. Load Libraries ---
library(shiny)
library(dplyr)
library(tidyr)
library(plotly)
library(DT)
library(ggplot2)
library(rlang)
library(readxl)
library(janitor)
library(shinyjs)
library(RColorBrewer)
library(colourpicker)
library(GGally)

# --- 2. Load Sample Data with Error Handling ---
required_files <- c("collar.csv", "assay.csv", "lithology.csv")
if (!all(file.exists(required_files))) {
  stop(paste("Error: One or more sample files not found. Please ensure", 
             paste(required_files, collapse=", "), 
             "are in the same directory as app.R"))
}
sample_collar <- read.csv("collar.csv")
sample_assay <- read.csv("assay.csv")
sample_lithology <- read.csv("lithology.csv")

# --- Helper functions for ggpairs plot ---

# Upper panel: Scatter plot with a linear regression line
custom_scatter_with_lm <- function(data, mapping, ...) {
  ggplot(data = data, mapping = mapping) +
    geom_point(color = "blue", alpha = 0.5) +
    geom_smooth(method = "lm", se = FALSE, color = "red", ...)
}

# Lower panel: Display calculated R-squared value
custom_r_squared_text <- function(data, mapping, ...) {
  x_col <- GGally::eval_data_col(data, mapping$x)
  y_col <- GGally::eval_data_col(data, mapping$y)
  
  correlation <- cor(x_col, y_col, use = "pairwise.complete.obs")
  r_squared <- correlation^2
  
  x_range <- range(x_col, na.rm = TRUE)
  y_range <- range(y_col, na.rm = TRUE)
  
  ggplot() +
    theme_void() +
    annotate(
      "text",
      x = mean(x_range),
      y = mean(y_range),
      label = paste("R² =", format(r_squared, digits = 2)),
      size = 5,
      ...
    )
}


# --- 3. UI Definition ---
ui <- fluidPage(
  tags$div(
    style = "position: relative; min-height: 100vh;",
    div(style="padding-bottom: 50px;",
        navbarPage(
          "GeoDataViz v17.2", 
          
          # Tab 1: Data Input & Integration
          tabPanel("Data Input & Integration",
                   sidebarLayout(
                     sidebarPanel(
                       width = 4,
                       h3("1. Data Source"),
                       radioButtons("dataSource", "Choose data source:",
                                    choices = c("Use Sample Data" = "sample",
                                                "Upload Your Own Data" = "upload"),
                                    selected = "sample"),
                       hr(),
                       conditionalPanel(
                         condition = "input.dataSource == 'upload'",
                         h3("2. Upload Files"),
                         selectInput("inputType", "Select Input Format:",
                                     choices = c("Excel (Single File)" = "excel",
                                                 "CSV (Multiple Files)" = "csv")),
                         hr(),
                         conditionalPanel(
                           condition = "input.inputType == 'excel'",
                           fileInput("excelFile", "Upload Excel File (.xlsx)", accept = c(".xlsx")),
                           hr(),
                           h3("Select Sheets"),
                           uiOutput("collarSheetUI"),
                           uiOutput("assaySheetUI"),
                           uiOutput("lithoSheetUI")
                         ),
                         conditionalPanel(
                           condition = "input.inputType == 'csv'",
                           fileInput("collarFile", "a. Upload Collar File (.csv)", accept = ".csv"),
                           fileInput("assayFile", "b. Upload Assay File (.csv)", accept = ".csv"),
                           fileInput("lithoFile", "c. Upload Lithology File (.csv)", accept = ".csv"),
                           radioButtons("sep", "CSV Separator:", choices = c(Comma = ",", Semicolon = ";"), selected = ";")
                         )
                       )
                     ),
                     mainPanel(
                       width = 8,
                       h3("About GeoDataViz"),
                       p(strong("GeoDataViz"), " is a comprehensive, interactive web application built with R Shiny, designed as an all-in-one workbench for geologists, data analysts, and students. It transforms raw drillhole data into actionable geological insights through powerful visualization and robust statistical analysis."),
                       p("Developed by a Senior Geologist for both educational and professional use, this application provides an open-source solution for the entire initial data analysis workflow, from data loading to advanced QA/QC, without the need for proprietary software."),
                       hr(),
                       
                       wellPanel(
                         style = "background-color: #f0f8ff;",
                         h3("Data Security is a Priority"),
                         tags$ul(
                           tags$li(strong("No Storage:"), "This application DOES NOT store your uploaded data."),
                           tags$li(strong("Session-Based:"), "Your data is processed only in the server's memory during your active session. It is permanently deleted when you close the browser window."),
                           tags$li(strong("No Database:"), "This application is not connected to any database to store your information.")
                         ),
                         hr(),
                         p(strong("Author:"), "Ghozian Islam Karami"),
                         p(strong("Contact:"), "ghoziankarami@gmail.com | ", 
                           tags$a(href="https://www.linkedin.com/in/ghoziankarami/", target="_blank", "LinkedIn"))
                       ),
                       hr(),
                       h3("Combined Data Preview"),
                       DTOutput("combinedDataTable")
                     )
                   )
          ),
          tabPanel("Column Definitions",
                   fluidPage(
                     h3("Define Column Names"),
                     p("Select the appropriate column names from your uploaded data. Defaults are set for the sample data."),
                     hr(),
                     fluidRow(
                       column(4, h4("Collar Data"), 
                              selectInput("col_collar_holeid", "Hole ID Column:", choices = NULL),
                              selectInput("col_x", "X (Easting) Column:", choices = NULL),
                              selectInput("col_y", "Y (Northing) Column:", choices = NULL),
                              selectInput("col_z", "Z (RL) Column:", choices = NULL)
                       ),
                       column(4, h4("Assay Data"), 
                              selectInput("col_assay_holeid", "Hole ID Column:", choices = NULL),
                              selectInput("col_assay_from", "From Column:", choices = NULL),
                              selectInput("col_assay_to", "To Column:", choices = NULL)
                       ),
                       column(4, h4("Lithology Data"), 
                              selectInput("col_litho_holeid", "Hole ID Column:", choices = NULL),
                              selectInput("col_litho_from", "From Column:", choices = NULL),
                              selectInput("col_litho_to", "To Column:", choices = NULL),
                              selectInput("col_litho", "Lithology Column:", choices = NULL)
                       )
                     )
                   )
          ),
          
          # Data Validation Tab
          tabPanel("Data Validation Summary",
                   fluidPage(
                     titlePanel("Data Validation Health Check"),
                     hr(),
                     fluidRow(
                       column(4, 
                              h4("File Record Counts"),
                              tableOutput("fileCountsTable")
                       ),
                       column(4,
                              h4("Collars Missing Assay Data"),
                              p("Hole IDs in Collar file, but not in Assay file."),
                              DTOutput("missingAssayTable")
                       ),
                       column(4,
                              h4("Assays Missing Collar Data"),
                              p("Hole IDs in Assay file, but not in Collar file."),
                              DTOutput("missingCollarTable") # UI baru
                       )
                     ),
                     hr(),
                     fluidRow(
                       column(12,
                              h4("Assay Interval Errors (Gaps / Overlaps)"),
                              p("This table shows intervals where the 'From' value does not match the previous 'To' value for the same Hole ID."),
                              DTOutput("intervalErrorsTable")
                       )
                     )
                   )
          ),
          
          # Tab 2: Drillhole Location Map
          tabPanel("Drillhole Location Map",
                   sidebarLayout(
                     sidebarPanel(
                       width = 3,
                       h4("Map Settings"),
                       uiOutput("mapColorSelectUI"),
                       sliderInput("markerSize", "Adjust Marker Size:", min = 1, max = 20, value = 8, step = 1),
                       hr(),
                       h4("Color Scale Settings"),
                       selectInput("scale_type", "Color Scale Type:",
                                   choices = c("Continuous" = "continuous", "Discrete" = "discrete")),
                       conditionalPanel(
                         condition = "input.scale_type == 'continuous'",
                         selectInput("continuous_palette", "Continuous Color Scale:",
                                     choices = c("Viridis", "Plasma", "Inferno", "Magma", "Cividis"),
                                     selected = "Viridis")
                       ),
                       conditionalPanel(
                         condition = "input.scale_type == 'discrete'",
                         hr(),
                         h5("Set Intervals & Colors (Discrete)"),
                         textInput("manual_breaks", "Enter Upper Interval Breaks (comma-separated)", placeholder = "e.g., 1, 1.5, 2"),
                         uiOutput("discretePaletteUI"),
                         hr(),
                         uiOutput("intervalFilterUI") 
                       )
                     ),
                     mainPanel(
                       width = 9,
                       plotlyOutput("drillholeMap", height = "700px")
                     )
                   )
          ),
          
          # Tab 3: Statistical Analysis
          tabPanel("Statistical Analysis",
                   sidebarLayout(
                     sidebarPanel(
                       width = 3,
                       h4("1. Variable Selection"),
                       selectInput("selectedGrades", "Select Grades for Analysis:", choices = NULL, multiple = TRUE),
                       hr(),
                       selectInput("selectedBoxplotGrade", "Select Grade for Boxplot:", choices = NULL)
                     ),
                     mainPanel(
                       width = 9,
                       h3("Summary Statistics"),
                       DTOutput("summaryStatsTable"),
                       hr(),
                       plotlyOutput("gradeHistogram"),
                       hr(),
                       plotlyOutput("lithologyBoxplot"),
                       hr(),
                       h3("Outlier Analysis"),
                       p("The table below lists data points identified as outliers (values beyond 1.5x the Interquartile Range)."),
                       uiOutput("outlierSummaryStatsUI"),
                       hr(),
                       DTOutput("outlierTable"),
                       hr(),
                       h4("Interactive Outlier Removal"),
                       p("Select rows from the table above, then click the button below to see the effect on summary statistics."),
                       actionButton("removeOutliers", "Remove Selected Outliers"),
                       hr(),
                       uiOutput("comparisonUI"),
                       uiOutput("downloadCleanedDataUI"),
                       hr(),
                       h4("Top Cut Analysis (Capping)"),
                       p("Enter a value to cap the selected grade and see the effect on summary statistics."),
                       numericInput("topCutValue", "Enter Top Cut Value:", value = NULL),
                       actionButton("applyTopCut", "Apply Top Cut"),
                       hr(),
                       uiOutput("topCutComparisonUI")
                     )
                   )
          ),
          
          # Tab 4: Bivariate Analysis
          tabPanel("Bivariate Analysis",
                   sidebarLayout(
                     sidebarPanel(
                       width = 3,
                       h4("Select Variables"),
                       uiOutput("bivariateXSelectUI"),
                       uiOutput("bivariateYSelectUI"),
                       hr(),
                       h4("Multivariate Variables"),
                       uiOutput("multivariateSelectUI")
                     ),
                     mainPanel(
                       width = 9,
                       tabsetPanel(
                         id = "bivariate_tabs",
                         tabPanel("Single Pair Regression",
                                  h3("Bivariate Regression Analysis by Lithology"),
                                  plotlyOutput("regressionPlot"),
                                  hr(),
                                  h4("R-squared Summary by Lithology"),
                                  DTOutput("regressionSummaryTable")
                         ),
                         tabPanel("Multivariate Matrix Plot",
                                  h3("Multivariate Scatter Plot Matrix"),
                                  p("This plot may take a few moments to render depending on the number of variables selected."),
                                  plotOutput("multivariatePlot", height = "800px")
                         )
                       )
                     )
                   )
          ),
          
          # Tab 5: Downhole Plot
          tabPanel("Downhole Plot",
                   sidebarLayout(
                     sidebarPanel(
                       width = 4,
                       uiOutput("holeSelectInput"),
                       hr(),
                       h4("Select Columns to Display (multiple allowed):"),
                       uiOutput("downholeColumnSelectUI")
                     ),
                     mainPanel(
                       width = 8,
                       plotlyOutput("downholePlot", height = "800px")
                     )
                   )
          ),
          
          # Tab 6: Color Settings
          tabPanel("Lithology Color Settings",
                   sidebarLayout(
                     sidebarPanel(
                       width = 4,
                       h3("Lithology Color Settings"),
                       helpText("Select a lithology to change its color, then pick a new color. The change is applied automatically."),
                       hr(),
                       uiOutput("selectLithoToColorUI"),
                       uiOutput("pickNewColorUI"),
                       hr(),
                       uiOutput("copyLithoColorUI")
                     ),
                     mainPanel(
                       width = 8,
                       h4("Current Color Preview"),
                       DTOutput("lithoColorPreviewTable")
                     )
                   )
          ),
          
          # Tab 7: About
          ## ## PERUBAHAN: Konten tab About diperbarui
          tabPanel("About",
                   fluidPage(
                     fluidRow(
                       column(8,
                        
                              h3("License"),
                              p("This project is licensed under the MIT License. Source code is available on ", tags$a(href="https://github.com/ghoziankarami/GeoDataViz/", target="_blank", "GitHub.")),
                              hr(),
                              
                              h3("Citation"),
                              p("If you use GeoDataViz in your research, publication, or report, please cite it as follows. Your citation is the best way to support the development of this open-source tool."),
                              
                              h4("Plain Text:"),
                              tags$pre(
                                "Karami, G. (2025). GeoDataViz: A comprehensive workbench for geological drillhole data analysis. GitHub Repository. https://github.com/ghoziankarami/GeoDataViz"
                              ),
                              
                              h4("BibTeX Format:"),
                              tags$pre(
                                "
@misc{Karami2025GeoDataViz,
  author = {Karami, Ghozian},
  title = {GeoDataViz: A comprehensive workbench for geological drillhole data analysis},
  year = {2025},
  publisher = {GitHub},
  journal = {GitHub repository},
  howpublished = {\\url{https://github.com/ghoziankarami/GeoDataViz}}
}"
                              )
                       ),
                       column(4,
                              wellPanel(
                                style = "margin-top: 20px;",
                                h4("Support the Project"),
                                p("If you find this application useful, please consider supporting its development."),
                                p("For donations or inquiries, you can reach out to the author via email:"),
                                p(strong("ghoziankarami@gmail.com"))
                              )
                       )
                     )
                   )
          )
        )
    ),
    tags$footer(
      style="position: absolute; bottom: 0; width: 100%; height: 50px; color: white; background-color: #333; text-align: center; padding: 15px;",
      "Developed for educational and professional use. Open-source for everyone."
    )
  )
)

# --- 4. Server Logic ---
server <- function(input, output, session) {
  
  useShinyjs()
  
  # Reactive values store
  rv <- reactiveValues(
    litho_colors = setNames(character(0), character(0)),
    removed_outlier_indices = NULL,
    top_cut_data = NULL,
    top_cut_summary_trigger = 0
  )
  
  # --- PART 1: DATA READING AND PREPARATION ---
  
  collar_data_raw <- reactive({
    if (input$dataSource == "sample") {
      return(sample_collar)
    } else {
      req(input$inputType)
      if (input$inputType == "excel") {
        req(input$excelFile, input$collar_sheet)
        return(readxl::read_excel(input$excelFile$datapath, sheet = input$collar_sheet))
      } else {
        req(input$collarFile)
        return(read.csv(input$collarFile$datapath, sep = input$sep, stringsAsFactors = FALSE, check.names = FALSE))
      }
    }
  })
  
  assay_data_raw <- reactive({
    if (input$dataSource == "sample") {
      return(sample_assay)
    } else {
      req(input$inputType)
      if (input$inputType == "excel") {
        req(input$excelFile, input$assay_sheet)
        return(readxl::read_excel(input$excelFile$datapath, sheet = input$assay_sheet))
      } else {
        req(input$assayFile)
        return(read.csv(input$assayFile$datapath, sep = input$sep, stringsAsFactors = FALSE, check.names = FALSE))
      }
    }
  })
  
  litho_data_raw <- reactive({
    if (input$dataSource == "sample") {
      return(sample_lithology)
    } else {
      req(input$inputType)
      if (input$inputType == "excel") {
        req(input$excelFile, input$litho_sheet)
        return(readxl::read_excel(input$excelFile$datapath, sheet = input$litho_sheet))
      } else {
        req(input$lithoFile)
        return(read.csv(input$lithoFile$datapath, sep = input$sep, stringsAsFactors = FALSE, check.names = FALSE))
      }
    }
  })
  
  collar_data <- reactive({ janitor::clean_names(collar_data_raw()) })
  assay_data <- reactive({ janitor::clean_names(assay_data_raw()) })
  litho_data <- reactive({ janitor::clean_names(litho_data_raw()) })
  
  excel_sheets <- reactive({
    req(input$inputType == "excel", input$excelFile)
    tryCatch(readxl::excel_sheets(input$excelFile$datapath),
             error = function(e) {
               showNotification("Invalid or corrupt Excel file.", type = "error"); NULL
             })
  })
  
  output$collarSheetUI <- renderUI({ selectInput("collar_sheet", "Select Collar Sheet:", choices = excel_sheets()) })
  output$assaySheetUI <- renderUI({ selectInput("assay_sheet", "Select Assay Sheet:", choices = excel_sheets()) })
  output$lithoSheetUI <- renderUI({ selectInput("litho_sheet", "Select Lithology Sheet:", choices = excel_sheets()) })
  
  find_col <- function(possible_names, actual_names) { intersect(possible_names, actual_names)[1] }
  
  observe({
    req(collar_data())
    cols <- names(collar_data())
    found_holeid <- find_col(c("hole_id", "holeid", "bhid", "hole"), cols)
    found_x <- find_col(c("x", "easting", "east"), cols)
    found_y <- find_col(c("y", "northing", "north"), cols)
    found_z <- find_col(c("z", "rl", "elevation", "depth"), cols)
    
    updateSelectInput(session, "col_collar_holeid", choices = cols, selected = if (!is.na(found_holeid)) found_holeid else cols[1])
    updateSelectInput(session, "col_x", choices = cols, selected = if (!is.na(found_x)) found_x else cols[1])
    updateSelectInput(session, "col_y", choices = cols, selected = if (!is.na(found_y)) found_y else cols[1])
    updateSelectInput(session, "col_z", choices = cols, selected = if (!is.na(found_z)) found_z else cols[1])
  })
  
  observe({
    req(assay_data())
    cols <- names(assay_data())
    found_holeid <- find_col(c("hole_id", "holeid", "bhid", "hole"), cols)
    found_from <- find_col(c("from", "dari"), cols)
    found_to <- find_col(c("to", "sampai"), cols)
    
    updateSelectInput(session, "col_assay_holeid", choices = cols, selected = if (!is.na(found_holeid)) found_holeid else cols[1])
    updateSelectInput(session, "col_assay_from", choices = cols, selected = if (!is.na(found_from)) found_from else cols[1])
    updateSelectInput(session, "col_assay_to", choices = cols, selected = if (!is.na(found_to)) found_to else cols[1])
  })
  
  observe({
    req(litho_data())
    cols <- names(litho_data())
    found_holeid <- find_col(c("hole_id", "holeid", "bhid", "hole"), cols)
    found_from <- find_col(c("from", "dari"), cols)
    found_to <- find_col(c("to", "sampai"), cols)
    found_litho <- find_col(c("lithology", "litho_code", "litho", "rock", "deskripsi"), cols)
    
    updateSelectInput(session, "col_litho_holeid", choices = cols, selected = if (!is.na(found_holeid)) found_holeid else cols[1])
    updateSelectInput(session, "col_litho_from", choices = cols, selected = if (!is.na(found_from)) found_from else cols[1])
    updateSelectInput(session, "col_litho_to", choices = cols, selected = if (!is.na(found_to)) found_to else cols[1])
    updateSelectInput(session, "col_litho", choices = cols, selected = if (!is.na(found_litho)) found_litho else cols[1])
  })
  
  
  collar_std <- reactive({
    req(collar_data(), input$col_collar_holeid, input$col_x, input$col_y, input$col_z)
    
    validate(
      need(input$col_collar_holeid %in% names(collar_data()), "Collar 'Hole ID' column not found in data. Please check Column Definitions."),
      need(input$col_x %in% names(collar_data()), "Collar 'X' column not found in data. Please check Column Definitions."),
      need(input$col_y %in% names(collar_data()), "Collar 'Y' column not found in data. Please check Column Definitions."),
      need(input$col_z %in% names(collar_data()), "Collar 'Z' column not found in data. Please check Column Definitions.")
    )
    
    df <- collar_data() %>%
      select(
        hole_id = .data[[input$col_collar_holeid]],
        x_coord = .data[[input$col_x]],
        y_coord = .data[[input$col_y]],
        z_coord = .data[[input$col_z]]
      ) %>%
      mutate(hole_id = as.character(hole_id))
    
    if(any(duplicated(df$hole_id))) {
      showNotification("Warning: Duplicate Hole IDs found in your collar file. This can cause issues in data joining. Please ensure Hole IDs are unique.", type = "warning", duration = 15)
    }
    
    df %>% distinct(hole_id, .keep_all = TRUE)
  })
  
  assay_std <- reactive({
    req(assay_data(), input$col_assay_holeid, input$col_assay_from, input$col_assay_to)
    
    validate(
      need(input$col_assay_holeid %in% names(assay_data()), "Assay 'Hole ID' column not found in data. Please check Column Definitions."),
      need(input$col_assay_from %in% names(assay_data()), "Assay 'From' column not found in data. Please check Column Definitions."),
      need(input$col_assay_to %in% names(assay_data()), "Assay 'To' column not found in data. Please check Column Definitions.")
    )
    
    assay_data() %>%
      select(
        hole_id = .data[[input$col_assay_holeid]],
        from = .data[[input$col_assay_from]],
        to = .data[[input$col_assay_to]],
        everything()
      ) %>%
      mutate(across(where(is.double) | where(is.integer), as.numeric), hole_id = as.character(hole_id), from = as.numeric(from), to = as.numeric(to))
  })
  
  litho_std <- reactive({
    req(litho_data(), input$col_litho_holeid, input$col_litho_from, input$col_litho_to, input$col_litho)
    
    validate(
      need(input$col_litho_holeid %in% names(litho_data()), "Lithology 'Hole ID' column not found in data. Please check Column Definitions."),
      need(input$col_litho_from %in% names(litho_data()), "Lithology 'From' column not found in data. Please check Column Definitions."),
      need(input$col_litho_to %in% names(litho_data()), "Lithology 'To' column not found in data. Please check Column Definitions."),
      need(input$col_litho %in% names(litho_data()), "Lithology 'Lithology' column not found in data. Please check Column Definitions.")
    )
    
    litho_data() %>%
      select(
        hole_id = .data[[input$col_litho_holeid]],
        from = .data[[input$col_litho_from]],
        to = .data[[input$col_litho_to]],
        lithology = .data[[input$col_litho]]
      ) %>%
      mutate(hole_id = as.character(hole_id), from = as.numeric(from), to = as.numeric(to), lithology = as.character(lithology))
  })
  
  combinedData <- reactive({
    req(assay_std(), collar_std(), litho_std())
    
    tryCatch({
      data_merged_1 <- left_join(assay_std(), collar_std(), by = "hole_id")
      final_data <- left_join(data_merged_1, litho_std(), by = c("hole_id", "from", "to"))
      
      final_data <- final_data %>%
        arrange(hole_id, from) %>%
        group_by(hole_id) %>%
        fill(lithology, .direction = "downup") %>%
        ungroup()
      
      final_data %>%
        mutate(unique_id = paste(hole_id, from, to, sep = "_"))
      
    }, error = function(e) {
      showNotification(paste("Error during data join:", e$message), type = "error", duration = 15); NULL
    })
  })
  
  output$combinedDataTable <- renderDT({
    validate(need(!is.null(combinedData()) && nrow(combinedData()) > 0, "Data is being processed or failed to load. Please check file inputs and column definitions."))
    datatable(head(combinedData(), 100), options = list(pageLength = 10, scrollX = TRUE, scrollCollapse = TRUE))
  })
  
  numeric_assay_cols <- reactive({
    req(assay_std())
    assay_std() %>% 
      select(where(is.numeric), -any_of(c("from", "to", "x_coord", "y_coord", "z_coord"))) %>% 
      names()
  })
  
  # --- Data Validation Logic ---
  output$fileCountsTable <- renderTable({
    req(collar_data(), assay_data(), litho_data())
    data.frame(
      File = c("Collar", "Assay", "Lithology"),
      Records = c(nrow(collar_data()), nrow(assay_data()), nrow(litho_data()))
    )
  })
  
  missing_assay_data <- reactive({
    req(collar_std(), assay_std())
    anti_join(collar_std(), assay_std(), by = "hole_id")
  })
  
  missing_collar_data <- reactive({
    req(collar_std(), assay_std())
    anti_join(assay_std(), collar_std(), by = "hole_id") %>% 
      distinct(hole_id, .keep_all = TRUE)
  })
  
  output$missingAssayTable <- renderDT({
    df <- missing_assay_data()
    if (nrow(df) > 0) {
      datatable(df, options = list(pageLength = 3, scrollX = TRUE))
    } else {
      datatable(data.frame(Status = "No missing assay data found."), options = list(dom = 't'))
    }
  })
  
  output$missingCollarTable <- renderDT({
    df <- missing_collar_data()
    if (nrow(df) > 0) {
      datatable(df %>% select(hole_id), options = list(pageLength = 3, scrollX = TRUE))
    } else {
      datatable(data.frame(Status = "No missing collar data found."), options = list(dom = 't'))
    }
  })
  
  interval_error_data <- reactive({
    req(assay_std())
    assay_std() %>%
      arrange(hole_id, from) %>%
      group_by(hole_id) %>%
      mutate(prev_to = lag(to)) %>%
      ungroup() %>%
      filter(!is.na(prev_to) & from != prev_to) %>%
      select(hole_id, prev_to, from, to)
  })
  
  output$intervalErrorsTable <- renderDT({
    df <- interval_error_data()
    if (nrow(df) > 0) {
      datatable(df, options = list(pageLength = 5, scrollX = TRUE))
    } else {
      datatable(data.frame(Status = "No interval errors detected."), options = list(dom = 't'))
    }
  })
  
  # --- Drillhole Location Map ---
  output$mapColorSelectUI <- renderUI({
    selectInput("mapColorColumn", "Color Map by Average:", 
                choices = c("None" = "", numeric_assay_cols()))
  })
  
  output$drillholeMap <- renderPlotly({
    validate(need(combinedData(), "Please upload and define files to view the map."))
    
    plot_data <- collar_std()
    
    p <- plot_ly()
    
    if (!is.null(input$mapColorColumn) && input$mapColorColumn != "") {
      req(input$mapColorColumn %in% names(assay_std()))
      
      avg_grades <- combinedData() %>%
        group_by(hole_id) %>%
        summarise(avg_grade = mean(.data[[input$mapColorColumn]], na.rm = TRUE), .groups = 'drop')
      
      plot_data <- left_join(plot_data, avg_grades, by = "hole_id")
      
      data_with_color <- plot_data %>% filter(!is.na(avg_grade))
      data_without_color <- plot_data %>% filter(is.na(avg_grade))
      
      if(nrow(data_without_color) > 0){
        p <- p %>% add_markers(
          data = data_without_color, x = ~x_coord, y = ~y_coord,
          type = 'scatter', mode = 'markers',
          marker = list(size = input$markerSize, color = 'lightgrey'),
          name = "No Data", text = ~paste("Hole ID:", hole_id), hoverinfo = 'text'
        )
      }
      
      if(nrow(data_with_color) > 0){
        p <- p %>% add_markers(
          data = data_with_color, x = ~x_coord, y = ~y_coord,
          type = 'scatter', mode = 'markers',
          marker = list(size = input$markerSize, color = ~avg_grade, colorscale = input$continuous_palette, showscale = TRUE,
                        colorbar = list(title = paste("Avg.", input$mapColorColumn))),
          name = "With Data", text = ~paste("Hole ID:", hole_id, "<br>Avg.", input$mapColorColumn, ":", round(avg_grade, 3)),
          hoverinfo = "text"
        )
      }
      
    } else {
      p <- p %>% add_markers(
        data = plot_data, x = ~x_coord, y = ~y_coord,
        type = 'scatter', mode = 'markers',
        marker = list(size = input$markerSize),
        text = ~paste("Hole ID:", hole_id),
        hoverinfo = 'text'
      )
    }
    
    p %>% layout(title = "Interactive Drillhole Location Map",
                 xaxis = list(title = "X Coordinate"),
                 yaxis = list(title = "Y Coordinate", scaleanchor = "x", scaleratio = 1),
                 showlegend = TRUE)
  })
  
  # --- Statistical Analysis ---
  
  observe({
    choices <- numeric_assay_cols()
    updateSelectInput(session, "selectedGrades", choices = choices, selected = choices[1])
  })
  
  observe({
    req(input$selectedGrades)
    updateSelectInput(session, "selectedBoxplotGrade", choices = input$selectedGrades, selected = input$selectedGrades[1])
  })
  
  output$summaryStatsTable <- renderDT({
    req(combinedData(), input$selectedGrades)
    validate(
      need(length(input$selectedGrades) > 0, "Please select at least one grade."),
      need(all(input$selectedGrades %in% names(combinedData())), "One or more selected grades are not valid. Please re-select.")
    )
    
    summary_df <- combinedData() %>%
      select(all_of(input$selectedGrades)) %>%
      pivot_longer(everything(), names_to = "Grade", values_to = "Value") %>%
      group_by(Grade) %>%
      summarise(Mean = round(mean(Value, na.rm = TRUE), 3), Median = round(median(Value, na.rm = TRUE), 3), 
                Min = round(min(Value, na.rm = TRUE), 3), Max = round(max(Value, na.rm = TRUE), 3), 
                `Std Dev` = round(sd(Value, na.rm = TRUE), 3), Count = n())
    datatable(summary_df)
  })
  
  output$gradeHistogram <- renderPlotly({
    req(combinedData(), input$selectedGrades)
    validate(
      need(length(input$selectedGrades) > 0, "Please select at least one grade."),
      need(all(input$selectedGrades %in% names(combinedData())), "One or more selected grades are not valid. Please re-select.")
    )
    
    data_plot <- combinedData() %>%
      select(all_of(input$selectedGrades)) %>%
      pivot_longer(everything(), names_to = "Grade", values_to = "Value")
    
    plot_ly(data_plot, x = ~Value, color = ~Grade, type = "histogram", alpha = 0.7, colors = "viridis") %>%
      layout(title = "Grade Distribution Histogram", xaxis = list(title = "Value"), yaxis = list(title = "Frequency"), barmode = "overlay")
  })
  
  output$lithologyBoxplot <- renderPlotly({
    req(combinedData(), input$selectedBoxplotGrade, rv$litho_colors)
    validate(
      need("lithology" %in% names(combinedData()), "'lithology' column not found."),
      need(input$selectedBoxplotGrade %in% names(combinedData()), "The selected grade for the boxplot is not valid."),
      need(length(rv$litho_colors) > 0, "Lithology colors are being generated.")
    )
    
    p <- ggplot(combinedData(), aes(x = lithology, y = .data[[input$selectedBoxplotGrade]], fill = lithology)) +
      geom_boxplot() +
      scale_fill_manual(values = rv$litho_colors) +
      labs(title = paste("Boxplot of", input$selectedBoxplotGrade, "by Lithology"), x = "Lithology", y = "Value") +
      theme_minimal() +
      theme(axis.text.x = element_text(angle = 45, hjust = 1))
    
    ggplotly(p)
  })
  
  outlier_data <- reactive({
    req(combinedData(), input$selectedBoxplotGrade)
    grade_col <- sym(input$selectedBoxplotGrade)
    stats <- combinedData() %>%
      filter(!is.na(!!grade_col)) %>%
      summarise(
        Q1 = quantile(!!grade_col, 0.25, na.rm = TRUE),
        Q3 = quantile(!!grade_col, 0.75, na.rm = TRUE)
      ) %>%
      mutate(IQR = Q3 - Q1)
    
    lower_bound <- stats$Q1 - 1.5 * stats$IQR
    upper_bound <- stats$Q3 + 1.5 * stats$IQR
    
    combinedData() %>%
      filter(!!grade_col < lower_bound | !!grade_col > upper_bound) %>%
      select(unique_id, hole_id, from, to, lithology, !!grade_col)
  })
  
  output$outlierSummaryStatsUI <- renderUI({
    req(outlier_data(), input$selectedBoxplotGrade)
    df <- outlier_data()
    
    if (nrow(df) > 0) {
      grade_col <- input$selectedBoxplotGrade
      
      summary_stats <- df %>%
        summarise(
          Count = n(),
          Average = round(mean(.data[[grade_col]], na.rm = TRUE), 3),
          Min = round(min(.data[[grade_col]], na.rm = TRUE), 3),
          Max = round(max(.data[[grade_col]], na.rm = TRUE), 3)
        )
      
      wellPanel(
        h4("Outlier Statistics"),
        p(paste("Count:", summary_stats$Count)),
        p(paste("Average:", summary_stats$Average)),
        p(paste("Min:", summary_stats$Min, " | Max:", summary_stats$Max))
      )
    }
  })
  
  output$outlierTable <- renderDT({
    datatable(outlier_data(), options = list(pageLength = 5, scrollX = TRUE), selection = 'multiple')
  })
  
  observeEvent(input$removeOutliers, {
    req(input$outlierTable_rows_selected)
    selected_ids <- outlier_data()[input$outlierTable_rows_selected, ]$unique_id
    rv$removed_outlier_indices <- unique(c(rv$removed_outlier_indices, selected_ids))
  })
  
  cleaned_data <- reactive({
    combinedData() %>%
      filter(!unique_id %in% rv$removed_outlier_indices)
  })
  
  output$comparisonUI <- renderUI({
    req(rv$removed_outlier_indices) 
    grade_col <- sym(input$selectedBoxplotGrade)
    
    original_summary <- combinedData() %>%
      summarise(
        Statistic = c("Count", "Mean", "Std Dev", "Min", "Max"),
        Value = c(n(), mean(!!grade_col, na.rm=T), sd(!!grade_col, na.rm=T), min(!!grade_col, na.rm=T), max(!!grade_col, na.rm=T))
      )
    
    cleaned_summary <- cleaned_data() %>%
      summarise(
        Statistic = c("Count", "Mean", "Std Dev", "Min", "Max"),
        Value = c(n(), mean(!!grade_col, na.rm=T), sd(!!grade_col, na.rm=T), min(!!grade_col, na.rm=T), max(!!grade_col, na.rm=T))
      )
    
    fluidRow(
      column(6, h5("Original Data Summary"), renderTable(original_summary, digits=3)),
      column(6, h5("Summary After Removal"), renderTable(cleaned_summary, digits=3))
    )
  })
  
  output$downloadCleanedDataUI <- renderUI({
    req(rv$removed_outlier_indices)
    downloadButton("downloadCleaned", "Download Cleaned Data (.csv)")
  })
  
  output$downloadCleaned <- downloadHandler(
    filename = function() { paste("cleaned_data-", Sys.Date(), ".csv", sep = "") },
    content = function(file) { write.csv(cleaned_data() %>% select(-unique_id), file, row.names = FALSE) }
  )
  
  observeEvent(input$applyTopCut, {
    req(input$topCutValue, input$selectedBoxplotGrade)
    grade_col <- sym(input$selectedBoxplotGrade)
    
    rv$top_cut_data <- combinedData() %>%
      mutate(!!grade_col := if_else(!!grade_col > input$topCutValue, input$topCutValue, !!grade_col))
    
    rv$top_cut_summary_trigger <- rv$top_cut_summary_trigger + 1
  })
  
  output$topCutComparisonUI <- renderUI({
    req(rv$top_cut_summary_trigger > 0)
    
    grade_col <- sym(input$selectedBoxplotGrade)
    
    original_summary <- combinedData() %>%
      summarise(
        Statistic = c("Count", "Mean", "Std Dev", "Min", "Max"),
        Value = c(n(), mean(!!grade_col, na.rm=T), sd(!!grade_col, na.rm=T), min(!!grade_col, na.rm=T), max(!!grade_col, na.rm=T))
      )
    
    top_cut_summary <- rv$top_cut_data %>%
      summarise(
        Statistic = c("Count", "Mean", "Std Dev", "Min", "Max"),
        Value = c(n(), mean(!!grade_col, na.rm=T), sd(!!grade_col, na.rm=T), min(!!grade_col, na.rm=T), max(!!grade_col, na.rm=T))
      )
    
    fluidRow(
      column(6, h5("Original Data Summary"), renderTable(original_summary, digits=3)),
      column(6, h5("Summary After Top Cut"), renderTable(top_cut_summary, digits=3))
    )
  })
  
  # --- Bivariate Analysis ---
  
  output$bivariateXSelectUI <- renderUI({
    selectInput("bivariateX", "Select X-axis Variable:", choices = numeric_assay_cols())
  })
  
  output$bivariateYSelectUI <- renderUI({
    choices <- numeric_assay_cols()
    selected_y <- if(length(choices) > 1) choices[2] else choices[1]
    selectInput("bivariateY", "Select Y-axis Variable:", choices = choices, selected = selected_y)
  })
  
  output$multivariateSelectUI <- renderUI({
    selectInput("multivariateVars", "Select Variables for Matrix:", 
                choices = numeric_assay_cols(), 
                selected = head(numeric_assay_cols(), 4),
                multiple = TRUE)
  })
  
  output$regressionPlot <- renderPlotly({
    req(combinedData(), input$bivariateX, input$bivariateY, rv$litho_colors)
    validate(need(input$bivariateX %in% names(combinedData()) && input$bivariateY %in% names(combinedData()), "Selected variables not found in data."))
    
    p <- ggplot(combinedData(), aes(x = .data[[input$bivariateX]], y = .data[[input$bivariateY]], color = lithology)) +
      geom_point(alpha = 0.6) +
      geom_smooth(method = "lm", se = FALSE) +
      scale_color_manual(values = rv$litho_colors) +
      labs(
        title = paste("Regression of", input$bivariateY, "vs.", input$bivariateX),
        x = input$bivariateX,
        y = input$bivariateY
      ) +
      theme_minimal()
    
    ggplotly(p)
  })
  
  output$regressionSummaryTable <- renderDT({
    req(combinedData(), input$bivariateX, input$bivariateY)
    
    summary_df <- combinedData() %>%
      group_by(lithology) %>%
      summarise(
        r_squared = {
          if(sum(!is.na(.data[[input$bivariateX]]) & !is.na(.data[[input$bivariateY]])) > 2) {
            cor(.data[[input$bivariateX]], .data[[input$bivariateY]], use = "pairwise.complete.obs")^2
          } else {
            NA_real_
          }
        },
        count = n(),
        .groups = 'drop'
      ) %>%
      mutate(r_squared = round(r_squared, 3)) %>%
      arrange(desc(r_squared))
    
    datatable(summary_df, options = list(pageLength = 5))
  })
  
  output$multivariatePlot <- renderPlot({
    req(combinedData(), input$multivariateVars)
    validate(need(length(input$multivariateVars) >= 2, "Please select at least two variables for the matrix plot."))
    
    data_for_plot <- combinedData() %>%
      select(all_of(input$multivariateVars))
    
    ggpairs(
      data_for_plot,
      upper = list(continuous = custom_scatter_with_lm),
      lower = list(continuous = custom_r_squared_text),
      diag = list(continuous = "densityDiag")
    ) +
      theme_minimal()
  })
  
  # --- Downhole Plot (Versi 14.1) ---
  
  output$holeSelectInput <- renderUI({
    req(collar_std())
    hole_ids <- unique(collar_std()$hole_id)
    selectInput("selectedHole", "Select Hole ID:", choices = sort(hole_ids), selected = hole_ids[1])
  })
  
  output$downholeColumnSelectUI <- renderUI({
    req(assay_std())
    exclude_cols <- c("hole_id", "from", "to", "x_coord", "y_coord", "z_coord")
    choices <- setdiff(names(assay_std()), exclude_cols)
    selectizeInput("selectedDownholeCols", NULL, 
                   choices = choices, selected = choices[1], multiple = TRUE)
  })
  
  output$downholePlot <- renderPlotly({
    req(combinedData(), input$selectedHole, rv$litho_colors)
    validate(need(!is.null(input$selectedDownholeCols) && length(input$selectedDownholeCols) > 0, 
                  "Please select at least one data column to display."))
    
    hole_data <- combinedData() %>%
      filter(hole_id == input$selectedHole) %>%
      arrange(from)
    
    validate(need(nrow(hole_data) > 0, "No data found for this Hole ID."))
    
    p_litho <- ggplot(hole_data) +
      geom_rect(aes(xmin = 0, xmax = 1, ymin = from, ymax = to, fill = lithology,
                    text = paste("From:", from, "<br>To:", to, "<br>Litho:", lithology))) +
      scale_y_reverse(name = "Depth (m)") + 
      scale_fill_manual(values = rv$litho_colors) + 
      theme_minimal() +
      theme(axis.text.x = element_blank(), axis.title.x = element_blank(), panel.grid = element_blank())
    
    plot_list <- list(ggplotly(p_litho, tooltip = "text"))
    
    for (col_name in input$selectedDownholeCols) {
      selected_col_sym <- sym(col_name)
      
      if(!col_name %in% names(hole_data)) next
      
      if (is.numeric(hole_data[[col_name]])) {
        p_data <- ggplot(hole_data, aes(y = from, text = paste("From:", from, "<br>To:", to, "<br>", col_name, ":", !!selected_col_sym))) +
          geom_rect(aes(xmin = 0, xmax = !!selected_col_sym, ymin = from, ymax = to), fill = "skyblue", color = "black", alpha = 0.7) +
          scale_y_reverse() + 
          theme_minimal() +
          theme(axis.text.y = element_blank(), axis.title.y = element_blank()) + 
          labs(x = col_name)
      } else {
        p_data <- ggplot(hole_data) +
          geom_rect(aes(xmin = 0, xmax = 1, ymin = from, ymax = to), fill = "gray95", color = "gray80") +
          geom_text(aes(x = 0.5, y = (from + to) / 2, label = !!selected_col_sym, text = paste("From:", from, "<br>To:", to, "<br>", !!selected_col_sym)), check_overlap = TRUE, size = 3) +
          scale_y_reverse() + 
          theme_minimal() +
          theme(axis.text.y = element_blank(), axis.title.y = element_blank(), axis.text.x = element_blank(), axis.title.x = element_blank(), panel.grid = element_blank())
      }
      plot_list <- append(plot_list, list(ggplotly(p_data, tooltip = "text")))
    }
    
    num_plots <- length(plot_list)
    if (num_plots > 1) {
      widths <- c(0.25, rep(0.75 / (num_plots - 1), num_plots - 1))
    } else {
      widths <- c(1)
    }
    
    subplot(plot_list, nrows = 1, shareY = TRUE, titleX = TRUE, widths = widths) %>%
      layout(title = paste("Downhole Plot for", input$selectedHole),
             margin = list(t = 80))
  })
  
  # --- Lithology Color Settings ---
  
  observe({
    req(combinedData())
    unique_lithos <- unique(combinedData()$lithology)
    unique_lithos <- unique_lithos[!is.na(unique_lithos)]
    
    if (!setequal(names(rv$litho_colors), unique_lithos)) {
      num_lithos <- length(unique_lithos)
      if (num_lithos > 0) {
        palette <- RColorBrewer::brewer.pal(min(num_lithos, 9), "Set1")
        if(num_lithos > length(palette)) {
          colors <- colorRampPalette(palette)(num_lithos)
        } else {
          colors <- palette[1:num_lithos]
        }
        rv$litho_colors <- setNames(colors, unique_lithos)
      } else {
        rv$litho_colors <- setNames(character(0), character(0))
      }
    }
  })
  
  output$selectLithoToColorUI <- renderUI({
    req(length(rv$litho_colors) > 0)
    selectInput("selectedLithoColor", "1. Select Lithology to Color:", choices = names(rv$litho_colors))
  })
  
  output$pickNewColorUI <- renderUI({
    req(input$selectedLithoColor)
    colourpicker::colourInput("newLithoColor", "2. Pick a New Color:", value = rv$litho_colors[input$selectedLithoColor])
  })
  
  observeEvent(input$newLithoColor, {
    req(input$selectedLithoColor)
    rv$litho_colors[input$selectedLithoColor] <- input$newLithoColor
  })
  
  output$lithoColorPreviewTable <- renderDT({
    req(length(rv$litho_colors) > 0)
    
    color_df <- data.frame(
      Lithology = names(rv$litho_colors),
      Color = unname(rv$litho_colors)
    ) %>%
      mutate(Preview = paste0(
        '<span style="display: inline-block; width: 100%; height: 20px; background-color:', 
        Color, 
        '; border: 1px solid #ccc;"></span>'
      ))
    
    datatable(color_df, escape = FALSE, options = list(pageLength = 10, autoWidth = TRUE, dom = 't'), rownames = FALSE)
  })
}

# --- 5. Run Application ---
shinyApp(ui, server)