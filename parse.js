
const expandMatrixParams = (params) => Object.entries(params).reduce(
    (paramsProduct, [param, values]) => paramsProduct.flatMap(
        existingParams => values.map(
            value => ({
                ...existingParams,
                [param]: value
            })
        )
    ),
    [{}]
)

const replaceMatrixTemplates = (string, params) => string.replace(/<< ?matrix\.(.+?) ?>>/g, (_, param) => params[param])

export const expandMatrixJobs = jobs =>
    jobs.flatMap(({name, job}) => {
        if(job.matrix) {
            return expandMatrixParams(job.matrix.parameters).map(params => ({
                name: replaceMatrixTemplates(job.name || name, params),
                job: {
                    ...job,
                    name: replaceMatrixTemplates(job.name || name, params),
                    requires: (job.requires || []).map(require => replaceMatrixTemplates(require, params))
                }
            }))
        }

        return [{name: job.name || name, job}]
    });

export const filterJobs = (jobs, filter) => jobs.filter(({job}) => {
    if(filter.branch) {
        if(!job.filters || !job.filters.branches) return true

        if(job.filters.branches.ignore) {
            const ignoreRegex = new RegExp(job.filters.branches.ignore.slice(1, job.filters.branches.ignore.length - 1))
            if(ignoreRegex.test(filter.branch)) {
                return false
            }
        }

        if(job.filters.branches.only) {
            const onlyRegex = new RegExp(job.filters.branches.only.slice(1, job.filters.branches.only.length - 1))
            return onlyRegex.test(filter.branch)
        }

		  return true
    }

    if(filter.tag) {
        if(!job.filters || !job.filters.tags) return false

        if(job.filters.tags.ignore) {
            const ignoreRegex = new RegExp(job.filters.tags.ignore.slice(1, job.filters.tags.ignore.length - 1))
            if(ignoreRegex.test(filter.tag)) {
                return false
            }
        }

        if(job.filters.tags.only) {
            const onlyRegex = new RegExp(job.filters.tags.only.slice(1, job.filters.tags.only.length - 1))
            return onlyRegex.test(filter.tag)
        }

		  return true
    }
})

export const filterUnrequitedJobs = jobs => {
    const jobNames = new Set(jobs.map(job => job.name))
	 const keptJobs = []

	for(const {job, name} of jobs) {
		if(
			!job.requires
			|| !job.requires.length
			|| !job.requires.every(requires => !jobNames.has(requires))
		) {
			keptJobs.push({job, name})
		} else {
			jobNames.delete(name)
		}
	}
	return keptJobs
}

export const filterJobRequires = jobs => {
    const jobNames = new Set(jobs.map(job => job.name))
    return jobs.map(({job, name}) => ({
        name,
        job: {
            ...job,
            requires: (job.requires || []).filter(requires => jobNames.has(requires))
        }
    }))
};

export const renderMermaid = (jobs, workflow) => jobs.flatMap(({name, job}) =>
    job.requires && job.requires.length ? job.requires.map(
        requires => `${workflow}-${requires}["${requires}"] --> ${workflow}-${name}["${name}"]`
    ) : `${workflow}-${name}["${name}"]`
).join('\n')


export const getWorkflowJobs = (config, workflow) => (config.workflows[workflow].jobs || []).map(job => ({
  name: Object.keys(job)[0],
  job: Object.values(job)[0],
}));
