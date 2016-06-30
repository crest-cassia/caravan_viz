# CARAVAN viz

A visualizing tool for the output of CARAVAN.

## preparing Typescript development environment

We adopted Typescript. Typescript needs type definition file.
In this project, definition files are managed by [tsd](https://github.com/Definitelytyped/tsd).
To install typescript compiler and type-definition files, run the following command.

```
npm install -g typescript tsd  # if tsd is not installed in your system
tsd install
```

To compile ts to js, run

```
tsc lineplot/*.ts timeline/*.ts scatter_sequence/*.ts
```

If you monitor the changes in ts file and would like to compile it whenever you update ts files, run

```
tsc -w lineplot/*.ts timeline/*.ts scatter_sequence/*.ts
```

## preparation of the server

The server runs on sinatra. Install dependent gems:

```
bundle
```

Then, run sinatra server giving input files as command line arguments:

```
bundle exec ruby server.rb runs.json parameter_sets.json
```

or

```
bundle exec ruby server.rb dump.bin
```

Access the following pages to see the results. Make sure that typescripts are compiled to JS beforehand.

- http://localhost:4567

