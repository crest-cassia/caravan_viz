# CARAVAN viz

A visualizing tool for the task scheduling of CARAVAN.

## Usage

Install Ruby 2.0 or later. If you do not have 'bundler' gem, please install it:

```
gem install bundler
```

Install dependent gems:

```
bundle
```

Then, run the server giving the output file of CARAVAN as command line arguments:

```
bundle exec ruby server.rb tasks.bin
```

Access the following pages to see the results.

- http://localhost:4567

## Notes for Developers

We adopted Typescript. Typescript needs type definition file.
In this project, definition files are managed by [tsd](https://github.com/Definitelytyped/tsd).
To install typescript compiler and type-definition files, run the following command.

```
npm install -g typescript tsd  # if tsd is not installed in your system
tsd install
```

To compile ts to js, run

```
tsc timeline/plot.ts
```

If you monitor the changes in ts file and would like to compile it whenever you update ts files, run

```
tsc -w timeline/plot.ts
```

After you updated ts files, commit "js" files as well such that users can skip compilation.
